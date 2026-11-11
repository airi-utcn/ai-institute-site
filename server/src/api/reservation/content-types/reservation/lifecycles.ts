import { snipeitService } from '../../services/snipeit';
import {
  sendReservationApprovedEmail,
  sendReservationReceivedEmail,
} from '../../services/notifications';

declare const strapi: any;
declare const console: any;

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

    event.state = event.state || {};
    event.state.statusTransition = null;

    if (!data.assetStatus) return;

    const oldReservation = await strapi.db
      .query('api::reservation.reservation')
      .findOne({ where });

    if (!oldReservation) return;

    event.state.previousStatus = oldReservation.assetStatus;

    if (oldReservation.assetStatus === data.assetStatus) {
      return;
    }

    event.state.statusTransition = data.assetStatus;

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

  async afterUpdate(event: any) {
    if (event.state?.statusTransition !== 'checked_out') return;

    try {
      let reservation = event.result;

      if (!reservation?.userEmail) {
        reservation = await strapi.db
          .query('api::reservation.reservation')
          .findOne({ where: event.params.where });
      }

      await sendReservationApprovedEmail(reservation);
    } catch (err) {
      // The status and Snipe-IT checkout are already committed. A mail outage
      // must not roll them back.
      console.error('Could not send reservation approval email:', err);
    }
  },
};
