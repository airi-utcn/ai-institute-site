type PreviewHandlerParams = {
  documentId?: string;
  locale?: string;
  status?: string;
  [key: string]: unknown;
};

type PreviewResolver = (
  params: PreviewHandlerParams,
  uid: string,
) => Promise<string | null> | string | null;

const resolveSlugCollectionPath = (basePath: string): PreviewResolver => {
  return async ({ documentId, locale, status }, uid) => {
    if (!documentId) return null;

    const strapiInstance = (global as any).strapi;
    if (!strapiInstance) return null;

    let doc: any = null;
    try {
      doc = await strapiInstance.documents(uid).findOne({
        documentId,
        ...(locale ? { locale } : {}),
        status: status || 'draft',
        fields: ['slug'],
      });
    } catch {}

    if (!doc?.slug) {
      try {
        doc = await strapiInstance.documents(uid).findOne({
          documentId,
          ...(locale ? { locale } : {}),
          fields: ['slug'],
        });
      } catch {}
    }

    if (!doc?.slug) {
      try {
        doc = await strapiInstance.documents(uid).findOne({
          documentId,
          locale: 'en',
          fields: ['slug'],
        });
      } catch {}
    }

    if (!doc?.slug) {
      try {
        const fallback = await strapiInstance.db.query(uid).findOne({
          where: { documentId },
          select: ['slug'],
        });
        if (fallback?.slug) {
          doc = fallback;
        }
      } catch {}
    }

    if (!doc?.slug) return null;
    return `${basePath}/${encodeURIComponent(doc.slug)}`;
  };
};

export const previewResolvers: Record<string, PreviewResolver> = {
  'api::engagement-page.engagement-page': () => '/engagement',
  'api::project.project': resolveSlugCollectionPath('/research/projects'),
};

export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    cookie: {
      path: '/',
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  preview: {
    enabled: true,
    config: {
      allowedOrigins: env('CLIENT_URL', 'http://localhost:3000'),
      async handler(uid: string, params: PreviewHandlerParams) {
        const resolver = previewResolvers[uid];
        if (!resolver) {
          return null;
        }

        const urlPath = await resolver(params, uid);
        if (!urlPath) {
          return null;
        }

        const previewUrl = new URL(
          '/api/preview',
          env('CLIENT_URL', 'http://localhost:3000'),
        );
        previewUrl.searchParams.set('url', urlPath);
        previewUrl.searchParams.set('secret', env('PREVIEW_SECRET'));
        previewUrl.searchParams.set('status', params?.status || 'draft');
        if (params?.locale) {
          previewUrl.searchParams.set('locale', params.locale);
        }

        return previewUrl.toString();
      },
    },
  },
  url: env("STRAPI_ADMIN_URL", "/strapi/admin"),
});
