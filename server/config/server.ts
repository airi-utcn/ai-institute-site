import cronTasks from './cron-tasks';

export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Koa proxy config is necessary in Strapi 5 behind a reverse-proxy
  proxy: true,
  // The public URL must be absolute and include the subpath
  url: env('PUBLIC_STRAPI_URL', 'https://airi.utcluj.ro/strapi'),
  app: {
    keys: env.array('APP_KEYS'),
  },
  // Enable the cron engine and pass env to tasks
  cron: {
    enabled: env.bool('DRAFT_NOTIFICATION_CRON_ENABLED', true),
    tasks: cronTasks({ env }),
  },
});
