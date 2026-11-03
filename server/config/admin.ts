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
      async handler(uid, { locale, status }) {
        if (uid !== 'api::engagement-page.engagement-page') {
          return null;
        }

        const previewUrl = new URL(
          '/api/preview',
          env('CLIENT_URL', 'http://localhost:3000'),
        );
        previewUrl.searchParams.set('url', '/engagement');
        previewUrl.searchParams.set('secret', env('PREVIEW_SECRET'));
        previewUrl.searchParams.set('status', status || 'draft');
        if (locale) {
          previewUrl.searchParams.set('locale', locale);
        }

        return previewUrl.toString();
      },
    },
  },
  url: env("STRAPI_ADMIN_URL", "/strapi/admin"),
});
