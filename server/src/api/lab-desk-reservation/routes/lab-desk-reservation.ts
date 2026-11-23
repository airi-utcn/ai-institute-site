export default {
  routes: [
    {
      method: 'GET',
      path: '/lab-desk-reservations',
      handler: 'lab-desk-reservation.find',
      config: { auth: { scope: ['api::lab-desk-reservation.lab-desk-reservation.find'] } },
    },
    {
      method: 'POST',
      path: '/lab-desk-reservations',
      handler: 'lab-desk-reservation.create',
      config: { auth: { scope: ['api::lab-desk-reservation.lab-desk-reservation.create'] } },
    },
    {
      method: 'DELETE',
      path: '/lab-desk-reservations/:id',
      handler: 'lab-desk-reservation.cancel',
      config: { auth: { scope: ['api::lab-desk-reservation.lab-desk-reservation.cancel'] } },
    },
  ],
};
