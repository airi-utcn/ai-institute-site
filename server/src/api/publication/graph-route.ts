const PUBLICATION_UID = 'api::publication.publication';

/**
 * The content API cannot unpublish a draft-and-publish document by sending
 * `publishedAt: null`; Strapi treats that as a publish request. Expose the
 * document service's unpublish operation so the sync pipeline can bury a paper
 * without needing admin credentials.
 */
export function registerGraphPublicationRoutes(strapi: any) {
  strapi.server.routes({
    type: 'content-api',
    routes: [
      {
        method: 'POST',
        path: '/publications/:documentId/unpublish',
        handler: async (ctx: any) => {
          const { documentId } = ctx.params || {};
          if (!documentId) {
            ctx.badRequest('documentId is required');
            return;
          }
          try {
            const result = await strapi
              .documents(PUBLICATION_UID)
              .unpublish({ documentId });
            ctx.body = { data: result };
          } catch (error: any) {
            ctx.throw(500, error?.message || 'Could not unpublish publication');
          }
        },
        config: {
          auth: {
            scope: ['api::publication.publication.update'],
          },
        },
      },
    ],
  });
}
