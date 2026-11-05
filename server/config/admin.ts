import {
  resolvePreviewPath,
  type PreviewHandlerParams,
} from '../src/utils/preview-targets';

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
      // Origins allowed to embed the frontend preview iframe.
      allowedOrigins: [env('CLIENT_URL', 'http://localhost:3000')],
      async handler(uid: string, params: PreviewHandlerParams) {
        const path = await resolvePreviewPath(uid, params);
        if (!path) return null;

        const secret = env('PREVIEW_SECRET');
        if (!secret) return null;

        const previewUrl = new URL(
          '/api/preview',
          env('CLIENT_URL', 'http://localhost:3000'),
        );
        previewUrl.searchParams.set('url', path);
        previewUrl.searchParams.set('secret', secret);
        previewUrl.searchParams.set('status', params.status || 'draft');
        if (params.locale) {
          previewUrl.searchParams.set('locale', params.locale);
        }

        return previewUrl.toString();
      },
    },
  },
  url: env("STRAPI_ADMIN_URL", "/strapi/admin"),
});
