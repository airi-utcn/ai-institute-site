import { snipeitService } from '../../services/snipeit';

declare const strapi: any;
declare const console: any;

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (value: unknown) => {
  if (!value) return '';

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

async function sendReservationReceivedEmail(reservation: any) {
  if (!reservation?.userEmail) return;

  const assetName = reservation.assetName || `Asset ${reservation.assetId}`;
  const startDate = formatDate(reservation.startDate);
  const endDate = formatDate(reservation.endDate);

  const subject = `Reservation request received: ${assetName}`;
  const text = [
    `We received your reservation request for ${assetName}.`,
    '',
    `Period: ${startDate} - ${endDate}`,
    'Status: pending approval',
    '',
    'Your request is not a confirmed booking yet. The AIRi team will review it and contact you if anything is needed.',
    'You will receive a separate confirmation from Snipe-IT when the equipment is handed over.',
    '',
    'AIRi @ UTCN',
  ].join('\n');

  const html = `
    <p>We received your reservation request for <strong>${escapeHtml(
      assetName
    )}</strong>.</p>
    <p><strong>Period:</strong> ${escapeHtml(startDate)} - ${escapeHtml(
      endDate
    )}<br />
    <strong>Status:</strong> pending approval</p>
    <p>Your request is not a confirmed booking yet. The AIRi team will review it and contact you if anything is needed.</p>
    <p>You will receive a separate confirmation from Snipe-IT when the equipment is handed over.</p>
    <p>AIRi @ UTCN</p>
  `;

  await strapi.plugin('email').service('email').send({
    to: reservation.userEmail,
    subject,
    text,
    html,
  });
}

export default {
  async afterCreate(event: any) {
    try {
      await sendReservationReceivedEmail(event.result);
    } catch (err) {
      // The reservation itself is already stored. A mail outage must not make
      // the request disappear from the admin queue.
      console.error('Could not send reservation confirmation email:', err);
    }
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;

    if (!data.assetStatus) return;

    const oldReservation = await strapi.db
      .query('api::reservation.reservation')
      .findOne({ where });

    if (
      !oldReservation ||
      oldReservation.assetStatus === data.assetStatus
    ) {
      return;
    }

    try {
      const email = data.userEmail || oldReservation.userEmail;
      const firstName = data.userFirstName || oldReservation.userFirstName;
      const lastName = data.userLastName || oldReservation.userLastName;
      const assetId = data.assetId || oldReservation.assetId;

      if (data.assetStatus === 'checked_out') {
        const userId = await snipeitService.findOrCreateUser(
          firstName,
          lastName,
          email
        );
        await snipeitService.checkoutAsset(
          assetId,
          userId,
          'Rezervat prin portalul AIRI'
        );
      } else if (data.assetStatus === 'returned') {
        await snipeitService.checkinAsset(
          assetId,
          'Returnat prin portalul AIRI'
        );
      }
    } catch (err) {
      console.error('Eroare la comunicarea Strapi -> Snipe-IT:', err);

      throw new Error(
        'Nu s-a putut sincroniza cu sistemul Snipe-IT. Verifică logurile.'
      );
    }
  },
};
