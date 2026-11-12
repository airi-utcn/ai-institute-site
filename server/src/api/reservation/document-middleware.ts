import { snipeitService } from './services/snipeit';
import { sendReservationReceivedEmail } from './services/notifications';

const RESERVATION_UID = 'api::reservation.reservation';

const SNAPSHOT_FIELDS = [
  'assetName',
  'assetTag',
  'assetModel',
  'assetSerial',
  'assetLocation',
  'assetImageUrl',
  'assetUrl',
] as const;

async function fillAssetSnapshot(data: any, previous: any) {
  const assetId = data.assetId ?? previous?.assetId;

  if (!assetId) return;

  const assetChanged = Boolean(
    previous &&
      data.assetId &&
      String(data.assetId) !== String(previous.assetId)
  );
  const missingSnapshot = SNAPSHOT_FIELDS.some(
    (field) => !data[field] && !previous?.[field]
  );

  if (!assetChanged && !missingSnapshot) return;

  try {
    const asset = await snipeitService.getAsset(String(assetId));
    const snapshot = snipeitService.buildAssetSnapshot(asset);

    if (assetChanged) {
      // The reservation now points at a different asset: replace the snapshot
      // instead of keeping stale values from the previous asset.
      for (const [key, value] of Object.entries(snapshot)) {
        if (value) data[key] = value;
      }
      return;
    }

    for (const [key, value] of Object.entries(snapshot)) {
      if (value && !data[key] && !previous?.[key]) {
        data[key] = value;
      }
    }
  } catch (err) {
    // The snapshot is helpful, not required. Keep the reservation usable when
    // Snipe-IT is temporarily unavailable.
    console.error('Could not load the Snipe-IT asset snapshot:', err);
  }
}

export function registerReservationWorkflow(strapi: any) {
  strapi.documents.use(async (ctx: any, next: () => Promise<any>) => {
    if (ctx.uid !== RESERVATION_UID) {
      return next();
    }

    if (ctx.action === 'create') {
      if (ctx.params?.data) {
        await fillAssetSnapshot(ctx.params.data, null);
      }

      const result = await next();

      try {
        await sendReservationReceivedEmail(result);
      } catch (err) {
        // The reservation is already stored. A mail outage must not make the
        // request disappear from the admin queue.
        console.error('Could not send reservation confirmation email:', err);
      }

      return result;
    }

    if (ctx.action !== 'update') {
      return next();
    }

    const data = ctx.params?.data || {};

    const previous = await strapi.db.query(RESERVATION_UID).findOne({
      where: { documentId: ctx.params.documentId },
    });

    if (!previous) {
      return next();
    }

    await fillAssetSnapshot(data, previous);

    if (!data.assetStatus || previous.assetStatus === data.assetStatus) {
      return next();
    }

    try {
      const email = data.userEmail || previous.userEmail;
      const firstName = data.userFirstName || previous.userFirstName;
      const lastName = data.userLastName || previous.userLastName;
      const assetId = data.assetId || previous.assetId;

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

    return next();
  });
}
