import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

export const LAB_DESK_RESERVATION_UID = 'api::lab-desk-reservation.lab-desk-reservation';

export function registerLabDeskReservationAccess(strapi: Core.Strapi) {
  strapi.documents.use(async (ctx, next) => {
    // Keep writes on the reservation controller's transaction path.
    if (ctx.uid === LAB_DESK_RESERVATION_UID) {
      throw new errors.ForbiddenError('Manage desk reservations on the AIRi website.');
    }
    return next();
  });
}
