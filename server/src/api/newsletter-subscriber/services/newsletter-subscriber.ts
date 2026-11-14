import { factories } from '@strapi/strapi';
import { subscribeToNewsletter } from '../../../utils/newsletter';

const UID = 'api::newsletter-subscriber.newsletter-subscriber';

export default factories.createCoreService(UID as any, ({ strapi }: any) => ({
  async subscribe(input: { email: string; source: string }) {
    return subscribeToNewsletter(strapi.documents(UID), input);
  },
}));
