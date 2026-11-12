import { snipeitService } from './services/snipeit';
import { sendReservationReceivedEmail } from './services/notifications';

const RESERVATION_UID = 'api::reservation.reservation';

const ACTIVE_STATUSES = ['pending', 'approved', 'checked_out'];
const CREATE_STATUSES = new Set(['pending', 'approved']);
const RESERVATION_STATUSES = new Set([
  'pending',
  'approved',
  'checked_out',
  'returned',
]);
const NUMERIC_ID = /^\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only these fields decide whether a Snipe-IT lookup is needed. Optional
// fields such as serial or location may legitimately be empty on the asset.
const SNAPSHOT_TRIGGER_FIELDS = [
  'assetName',
  'assetTag',
  'assetModel',
] as const;

type ReservationFields = {
  assetId: string;
  assetName: string;
  startDate: string;
  endDate: string;
  status: string;
  userEmail: string;
};

const asString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const isValidDate = (value: string) =>
  ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const isActiveStatus = (status: string) => ACTIVE_STATUSES.includes(status);

function effectiveFields(data: any, previous: any): ReservationFields {
  return {
    assetId: asString(data.assetId ?? previous?.assetId),
    assetName: asString(data.assetName ?? previous?.assetName),
    startDate: asString(data.startDate ?? previous?.startDate),
    endDate: asString(data.endDate ?? previous?.endDate),
    status: asString(data.assetStatus ?? previous?.assetStatus ?? 'pending'),
    userEmail: asString(data.userEmail ?? previous?.userEmail),
  };
}

function validateReservation(fields: ReservationFields) {
  if (!NUMERIC_ID.test(fields.assetId)) {
    throw new Error('A valid Snipe-IT asset id is required.');
  }

  if (!fields.assetName) {
    throw new Error('The asset name is required.');
  }

  if (!isValidDate(fields.startDate) || !isValidDate(fields.endDate)) {
    throw new Error('Reservation dates must use the YYYY-MM-DD format.');
  }

  if (fields.endDate < fields.startDate) {
    throw new Error('The end date must be on or after the start date.');
  }

  if (!RESERVATION_STATUSES.has(fields.status)) {
    throw new Error(`Unknown reservation status "${fields.status}".`);
  }

  if (!EMAIL.test(fields.userEmail)) {
    throw new Error('A valid requester email is required.');
  }
}

function availabilityChanged(
  previous: any,
  fields: ReservationFields
): boolean {
  if (!previous) return true;

  return (
    String(fields.assetId) !== String(previous.assetId ?? '') ||
    fields.startDate !== String(previous.startDate ?? '') ||
    fields.endDate !== String(previous.endDate ?? '') ||
    fields.status !== String(previous.assetStatus ?? '') ||
    !isActiveStatus(String(previous.assetStatus ?? ''))
  );
}

async function assertNoOverlap(
  strapi: any,
  fields: ReservationFields,
  documentId?: string
) {
  if (!isActiveStatus(fields.status)) return;

  const where: any = {
    assetId: fields.assetId,
    assetStatus: { $in: ACTIVE_STATUSES },
    startDate: { $lte: fields.endDate },
    endDate: { $gte: fields.startDate },
  };

  if (documentId) {
    where.documentId = { $ne: documentId };
  }

  const conflict = await strapi.db.query(RESERVATION_UID).findOne({
    where,
    select: ['id', 'documentId', 'startDate', 'endDate', 'assetStatus'],
  });

  if (conflict) {
    throw new Error(
      'This equipment is already reserved for the selected period.'
    );
  }
}

async function fillAssetSnapshot(
  data: any,
  previous: any,
  logWarn: (message: string, err: unknown) => void
) {
  const assetId = asString(data.assetId ?? previous?.assetId);

  if (!NUMERIC_ID.test(assetId)) return;

  const assetChanged = Boolean(
    previous &&
      data.assetId &&
      String(data.assetId) !== String(previous.assetId)
  );
  const missingSnapshot = SNAPSHOT_TRIGGER_FIELDS.some(
    (field) => !data[field] && !previous?.[field]
  );

  if (!assetChanged && !missingSnapshot) return;

  try {
    const asset = await snipeitService.getAsset(assetId);

    if (!asset) return;

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
    logWarn('Could not load the Snipe-IT asset snapshot', err);
  }
}

async function syncSnipeIt(
  data: any,
  previous: any,
  fields: ReservationFields
) {
  const assetChanged =
    String(fields.assetId) !== String(previous.assetId ?? '');
  const wasOut = String(previous.assetStatus ?? '') === 'checked_out';
  const isOut = fields.status === 'checked_out';

  if (!wasOut && !isOut) return;
  if (wasOut && isOut && !assetChanged) return;

  // Check out the new asset before releasing the old one. If the checkout
  // fails, nothing has changed; if the check-in fails, retrying the save is
  // safe because checkout is idempotent for the same requester.
  if (isOut) {
    const userId = await snipeitService.findOrCreateUser(
      asString(data.userFirstName ?? previous.userFirstName),
      asString(data.userLastName ?? previous.userLastName),
      fields.userEmail
    );

    await snipeitService.checkoutAsset(
      fields.assetId,
      userId,
      'Reserved through the AIRI portal'
    );

    data.snipeitUserId = String(userId);
  }

  if (wasOut && (!isOut || assetChanged)) {
    await snipeitService.checkinAsset(
      String(previous.assetId),
      assetChanged
        ? 'Reservation moved to another asset'
        : 'Returned through the AIRI portal',
      previous.snipeitUserId
    );
  }
}

export function registerReservationWorkflow(strapi: any) {
  const logError = (message: string, err: unknown) => {
    if (strapi.log?.error) {
      strapi.log.error(message, err);
      return;
    }
    console.error(message, err);
  };

  const logWarn = (message: string, err: unknown) => {
    if (strapi.log?.warn) {
      strapi.log.warn(message, err);
      return;
    }
    console.warn(message, err);
  };

  strapi.documents.use(async (ctx: any, next: () => Promise<any>) => {
    if (ctx.uid !== RESERVATION_UID) {
      return next();
    }

    const data = ctx.params?.data || {};

    if (ctx.action === 'create') {
      await fillAssetSnapshot(data, null, logWarn);

      const fields = effectiveFields(data, null);
      validateReservation(fields);

      if (!CREATE_STATUSES.has(fields.status)) {
        throw new Error(
          'Create the reservation as pending or approved first, then mark it checked out.'
        );
      }

      await assertNoOverlap(strapi, fields);

      const result = await next();

      try {
        await sendReservationReceivedEmail(strapi, result);
      } catch (err) {
        // The reservation is already stored. A mail outage must not make the
        // request disappear from the admin queue.
        logError('Could not send reservation confirmation email', err);
      }

      return result;
    }

    if (ctx.action !== 'update') {
      return next();
    }

    const previous = await strapi.db.query(RESERVATION_UID).findOne({
      where: { documentId: ctx.params.documentId },
    });

    if (!previous) {
      return next();
    }

    await fillAssetSnapshot(data, previous, logWarn);

    const fields = effectiveFields(data, previous);
    validateReservation(fields);

    if (availabilityChanged(previous, fields)) {
      await assertNoOverlap(strapi, fields, ctx.params.documentId);
    }

    const assetChanged = Boolean(
      data.assetId && String(data.assetId) !== String(previous.assetId ?? '')
    );

    if (
      assetChanged ||
      (data.assetStatus && data.assetStatus !== previous.assetStatus)
    ) {
      try {
        await syncSnipeIt(data, previous, fields);
      } catch (err) {
        logError('Snipe-IT reservation sync failed', err);
        throw new Error(
          'Could not sync with Snipe-IT. Check the server logs.'
        );
      }
    }

    return next();
  });
}
