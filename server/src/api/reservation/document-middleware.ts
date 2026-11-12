import { snipeitService } from './services/snipeit';
import { sendReservationReceivedEmail } from './services/notifications';

const RESERVATION_UID = 'api::reservation.reservation';

export function registerReservationWorkflow(strapi: any) {
  strapi.documents.use(async (ctx: any, next: () => Promise<any>) => {
    if (ctx.uid !== RESERVATION_UID) {
      return next();
    }

    if (ctx.action === 'create') {
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

    if (!data.assetStatus) {
      return next();
    }

    const previous = await strapi.db.query(RESERVATION_UID).findOne({
      where: { documentId: ctx.params.documentId },
    });

    if (!previous || previous.assetStatus === data.assetStatus) {
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
