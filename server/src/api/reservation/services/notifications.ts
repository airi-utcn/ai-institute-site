const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const assetNameFor = (reservation: any) => {
  const tag = String(reservation?.assetTag || '').trim();
  const name = String(
    reservation?.assetName || reservation?.assetModel || ''
  ).trim();

  if (tag && name && !name.includes(tag)) {
    return `${tag} — ${name}`;
  }

  return tag || name || `Asset ${reservation?.assetId ?? ''}`.trim();
};

const assetDetailsFor = (reservation: any) => {
  const details = [];

  if (reservation?.assetModel) {
    details.push(`Model: ${reservation.assetModel}`);
  }
  if (reservation?.assetSerial) {
    details.push(`Serial: ${reservation.assetSerial}`);
  }
  if (reservation?.assetLocation) {
    details.push(`Location: ${reservation.assetLocation}`);
  }

  return details;
};

async function sendEmail(
  strapi: any,
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

export async function sendReservationReceivedEmail(
  strapi: any,
  reservation: any
) {
  if (!reservation?.userEmail || !EMAIL.test(reservation.userEmail)) return;

  const assetName = assetNameFor(reservation);
  const startDate = formatDate(reservation.startDate);
  const endDate = formatDate(reservation.endDate);

  const details = assetDetailsFor(reservation);

  const subject = `Reservation request received: ${assetName}`;
  const text = [
    `We received your reservation request for ${assetName}.`,
    '',
    ...details,
    ...(details.length ? [''] : []),
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
    ${
      details.length
        ? `<p>${details.map((line) => escapeHtml(line)).join('<br />')}</p>`
        : ''
    }
    <p><strong>Period:</strong> ${escapeHtml(startDate)} - ${escapeHtml(
      endDate
    )}<br />
    <strong>Status:</strong> pending approval</p>
    <p>Your request is not a confirmed booking yet. The AIRi team will review it and contact you if anything is needed.</p>
    <p>We will send you a confirmation when your reservation is approved.</p>
    <p>AIRi @ UTCN</p>
  `;

  await sendEmail(strapi, reservation.userEmail, subject, text, html);
}
