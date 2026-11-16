// only the signup route exists, so the subscriber list can't be read through the API
export default {
  routes: [
    {
      method: 'POST',
      path: '/newsletter-subscribers/subscribe',
      handler: 'newsletter-subscriber.subscribe',
      config: { auth: false },
    },
  ],
};
