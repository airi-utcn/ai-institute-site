import { snipeitService } from './services/snipeit';
import {
  sendReservationApprovedEmail,
  sendReservationReceivedEmail,
} from './services/notifications';

const RESERVATION_UID = 'api::reservation.reservation';

const mergedReservation = (previous: any, data: any, result: any) => ({
  ...previous,
  ...data,
  ...(result || {}),
});

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

    const result = await next();

    // Send the approval email once, and only for the first approval. A
    // returned reservation that is checked out again must not email the user.
    const shouldSendApproval =
      data.assetStatus === 'checked_out' &&
      !previous.approvalEmailSentAt &&
      (previous.assetStatus === 'pending' || previous.assetStatus === 'approved');

    if (shouldSendApproval) {
      const reservation = mergedReservation(previous, data, result);

      if (reservation?.userEmail) {
        try {
          await sendReservationApprovedEmail(reservation);
        } catch (err) {
          // The status and Snipe-IT checkout are already committed. A mail
          // outage must not roll them back.
          console.error('Could not send reservation approval email:', err);
          return result;
        }

        try {
          await strapi.db.query(RESERVATION_UID).update({
            where: { id: previous.id },
            data: { approvalEmailSentAt: new Date() },
          });

          console.info(
            `Reservation approval email sent for ${previous.documentId}`
          );
        } catch (err) {
          // The mail was sent, but the marker could not be stored. Log it so
          // an operator can prevent a resend if needed.
          console.error(
            'Could not record reservation approval email timestamp:',
            err
          );
        }
      }
    }

    return result;
  });
}
