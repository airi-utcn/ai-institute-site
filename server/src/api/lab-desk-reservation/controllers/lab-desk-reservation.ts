import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';
import { isTrustedContentApiTokenRequest } from '../../../utils/draft-access';
import { LAB_DESK_RESERVATION_UID } from '../document-middleware';

const LABORATORY_UID = 'api::laboratory.laboratory';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const bucharestClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Bucharest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function bucharestNow() {
  const parts = Object.fromEntries(
    bucharestClock.formatToParts(new Date()).map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isFieldText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 255;
}

function fail(ctx: Context, status: number, message: string) {
  ctx.status = status;
  ctx.body = { error: { status, message } };
}

function getViewer(ctx: Context) {
  ctx.set('Cache-Control', 'private, no-store');
  const userObjectId = ctx.get('x-airi-user-id').trim();
  // A generic read-only token has an implicit grant for any Strapi find action.
  if (!isTrustedContentApiTokenRequest(ctx)
    || ctx.state.auth.credentials?.type === 'read-only'
    || !isFieldText(userObjectId)) {
    fail(ctx, 403, 'An institutional sign-in is required.');
    return null;
  }
  return userObjectId;
}

type Reservation = {
  documentId: string;
  desk: number;
  startTime: string;
  endTime: string;
  bookedBy: string;
  userObjectId: string;
};

function presentReservation(row: Reservation, viewer: string) {
  return {
    id: row.documentId,
    desk: row.desk,
    startTime: row.startTime,
    endTime: row.endTime,
    bookedBy: row.bookedBy,
    mine: row.userObjectId === viewer,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const reservations = () => strapi.db.query(LAB_DESK_RESERVATION_UID);
  const publishedLab = (slug: string) => strapi.db.query(LABORATORY_UID).findOne({
    where: { slug, publishedAt: { $notNull: true } },
    select: ['documentId'],
    orderBy: { id: 'asc' },
  });

  return {
    async find(ctx: Context) {
      const viewer = getViewer(ctx);
      if (!viewer) return;
      const { laboratory, date } = ctx.query;
      if (!isFieldText(laboratory) || !isIsoDate(date)) {
        return fail(ctx, 400, 'Choose a laboratory and a valid date.');
      }

      const lab = await publishedLab(laboratory.trim());
      if (!lab) return fail(ctx, 404, 'Laboratory not found.');

      const bookings = await reservations().findMany({
        where: { laboratoryDocumentId: lab.documentId, date },
        orderBy: [{ desk: 'asc' }, { startTime: 'asc' }],
      });
      ctx.body = { reservations: bookings.map((booking) => presentReservation(booking, viewer)) };
    },

    async create(ctx: Context) {
      const viewer = getViewer(ctx);
      if (!viewer) return;
      const { laboratory, date, desk, startTime, endTime, bookedBy } = ctx.request.body || {};
      if (!isFieldText(laboratory) || !isIsoDate(date) || !isFieldText(bookedBy)) {
        return fail(ctx, 400, 'Choose a laboratory and a valid date.');
      }
      if (!Number.isInteger(desk) || desk < 1 || desk > 12) {
        return fail(ctx, 400, 'Choose a desk from 1 to 12.');
      }
      if (typeof startTime !== 'string' || !CLOCK_TIME.test(startTime)
        || typeof endTime !== 'string' || !CLOCK_TIME.test(endTime)
        || startTime < '08:00' || endTime > '20:00' || endTime <= startTime) {
        return fail(ctx, 400, 'Choose a start and end time between 08:00 and 20:00.');
      }

      const lab = await publishedLab(laboratory.trim());
      if (!lab) return fail(ctx, 404, 'Laboratory not found.');
      const laboratoryDocumentId = lab.documentId;

      return strapi.db.transaction(async ({ trx }) => {
        const laboratoryRows = () => strapi.db.getConnection(strapi.db.metadata.get(LABORATORY_UID).tableName)
          .transacting(trx)
          .where({ document_id: laboratoryDocumentId });

        // Writers for a laboratory must acquire the same lock before checking for overlaps.
        if (strapi.db.dialect.client === 'sqlite') {
          // SQLite has no row-level write locks. Acquire its write lock before any read.
          await laboratoryRows().update({ document_id: laboratoryDocumentId });
        } else {
          const lockedLab = await laboratoryRows().orderBy('id', 'asc').first('id').forUpdate();
          if (!lockedLab) return fail(ctx, 409, 'The laboratory changed while booking. Please try again.');
        }

        if (!(await laboratoryRows().whereNotNull('published_at').first('id'))) {
          return fail(ctx, 404, 'Laboratory not found.');
        }
        if (`${date}T${startTime}` <= bucharestNow()) {
          return fail(ctx, 400, 'Choose a start time in the future.');
        }

        const overlap = await reservations().findOne({
          where: {
            laboratoryDocumentId, date, desk,
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          },
          select: ['id'],
        });
        if (overlap) return fail(ctx, 409, 'This desk is already booked during the selected time.');

        const booking = await reservations().create({
          data: {
            laboratoryDocumentId,
            date,
            desk,
            startTime,
            endTime,
            bookedBy: bookedBy.trim(),
            userObjectId: viewer,
          },
        });
        ctx.status = 201;
        ctx.body = { reservation: presentReservation(booking, viewer) };
      });
    },

    async cancel(ctx: Context) {
      const viewer = getViewer(ctx);
      if (!viewer) return;
      const { id } = ctx.params;
      if (!isFieldText(id)) return fail(ctx, 400, 'Choose a valid reservation.');
      const booking = await reservations().findOne({
        where: { documentId: id, userObjectId: viewer },
      });
      if (!booking) return fail(ctx, 404, 'Reservation not found.');
      if (`${booking.date}T${booking.startTime}` <= bucharestNow()) {
        return fail(ctx, 409, 'A reservation can only be cancelled before it starts.');
      }

      await reservations().delete({ where: { id: booking.id } });
      ctx.status = 204;
    },
  };
};
