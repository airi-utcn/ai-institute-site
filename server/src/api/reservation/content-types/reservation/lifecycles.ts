import { snipeitService } from '../../services/snipeit';

declare const strapi: any;
declare const console: any;

export default {
  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    
    if (!data.assetStatus) return;

    const oldReservation = await strapi.db.query('api::reservation.reservation').findOne({ where });
    
    if (!oldReservation || oldReservation.assetStatus === data.assetStatus) return;

    try {
      const email = data.userEmail || oldReservation.userEmail;
      const firstName = data.userFirstName || oldReservation.userFirstName;
      const lastName = data.userLastName || oldReservation.userLastName;
      const assetId = data.assetId || oldReservation.assetId;

      if (data.assetStatus === 'checked_out') {
        const userId = await snipeitService.findOrCreateUser(firstName, lastName, email);
        await snipeitService.checkoutAsset(assetId, userId, "Rezervat prin portalul AIRI");
      } 
      else if (data.assetStatus === 'returned') {
        await snipeitService.checkinAsset(assetId, "Returnat prin portalul AIRI");
      }
      
    } catch (err) {
      console.error("Eroare la comunicarea Strapi -> Snipe-IT:", err);
      
      throw new Error("Nu s-a putut sincroniza cu sistemul Snipe-IT. Verifică logurile.");
    }
  }
};