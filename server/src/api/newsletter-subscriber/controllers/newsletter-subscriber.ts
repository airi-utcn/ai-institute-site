import { factories } from '@strapi/strapi';
import { validateSubscription } from '../../../utils/newsletter';

const UID = 'api::newsletter-subscriber.newsletter-subscriber';

export default factories.createCoreController(UID as any, ({ strapi }: any) => ({
  async subscribe(ctx: any) {
    const body = ctx.request.body;
    const check = validateSubscription(body?.data ?? body);

    if (!check.ok) {
      return ctx.badRequest(check.message, { code: check.code });
    }

    const status = await strapi.service(UID).subscribe(check.value);

    ctx.status = status === 'subscribed' ? 201 : 200;
    ctx.body = { data: { status } };
  },
}));
