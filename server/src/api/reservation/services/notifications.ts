declare const strapi: any;

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

const assetNameFor = (reservation: any) =>
  reservation?.assetName || `Asset ${reservation?.assetId ?? ''}`.trim();

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string
) {
  await strapi.plugin('email').service('email').send({
    to,
    subject,
    text,
    html,
  });
}

export async function sendReservationReceivedEmail(reservation: any) {
  if (!reservation?.userEmail) return;

  const assetName = assetNameFor(reservation);
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
    'We will send you a confirmation when your reservation is approved.',
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
    <p>We will send you a confirmation when your reservation is approved.</p>
    <p>AIRi @ UTCN</p>
  `;

  await sendEmail(reservation.userEmail, subject, text, html);
}

export async function sendReservationApprovedEmail(reservation: any) {
  if (!reservation?.userEmail) return;

  const assetName = assetNameFor(reservation);
  const startDate = formatDate(reservation.startDate);
  const endDate = formatDate(reservation.endDate);

  const subject = `Reservation approved: ${assetName}`;
  const text = [
    `Your reservation for ${assetName} has been approved.`,
    '',
    `Period: ${startDate} - ${endDate}`,
    'Status: approved',
    '',
    'The AIRi team has approved your request. Please contact them if you have not received pickup instructions.',
    'If your plans change, let us know so the equipment can be offered to someone else.',
    '',
    'AIRi @ UTCN',
  ].join('\n');

  const html = `
    <p>Your reservation for <strong>${escapeHtml(
      assetName
    )}</strong> has been approved.</p>
    <p><strong>Period:</strong> ${escapeHtml(startDate)} - ${escapeHtml(
      endDate
    )}<br />
    <strong>Status:</strong> approved</p>
    <p>The AIRi team has approved your request. Please contact them if you have not received pickup instructions.</p>
    <p>If your plans change, let us know so the equipment can be offered to someone else.</p>
    <p>AIRi @ UTCN</p>
  `;

  await sendEmail(reservation.userEmail, subject, text, html);
}
