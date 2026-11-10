const LOCAL_AUTH_PATHS = new Set([
  '/admin/login',
  '/admin/register-admin',
  '/admin/register',
  '/admin/forgot-password',
  '/admin/reset-password',
]);

const ADMIN_LANDING_PATHS = new Set(['/admin', '/admin/auth/login']);

const normalisePath = (path: string) => {
  const trimmed = (path || '/').replace(/\/+$/, '');
  return trimmed || '/';
};

const isEnabled = () => {
  const configured = process.env.ADMIN_SSO_ONLY;

  if (configured !== undefined && configured !== '') {
    return /^(1|true|yes|on)$/i.test(configured);
  }

  // If the Azure AD settings are present, protect the admin by default.
  return Boolean(
    process.env.AZUREAD_TENANT_ID &&
      process.env.AZUREAD_OAUTH_CLIENT_ID &&
      process.env.AZUREAD_OAUTH_CLIENT_SECRET
  );
};

const adminPathVariants = (strapi: any) => {
  const configured = normalisePath(
    strapi.config.get('admin.path', '/admin') || '/admin'
  );
  const variants = new Set([configured]);

  // The reverse proxy may add or strip the subpath (e.g. /strapi), so accept
  // both /admin and /strapi/admin on the same server.
  const segments = configured.split('/').filter(Boolean);
  const adminIndex = segments.lastIndexOf('admin');
  if (adminIndex > 0) {
    variants.add(`/${segments.slice(adminIndex).join('/')}`);
  }

  try {
    const serverPrefix = normalisePath(
      new URL(strapi.config.get('server.url')).pathname
    );
    if (serverPrefix !== '/') {
      if (!configured.startsWith(`${serverPrefix}/`)) {
        variants.add(`${serverPrefix}${configured}`);
      }
    }
  } catch {
    // Ignore invalid server.url values; the configured admin path still works.
  }

  return variants;
};

const relativeAdminPath = (path: string, variants: Set<string>) => {
  for (const base of variants) {
    if (path === base) return '/admin';
    if (path.startsWith(`${base}/`)) {
      return `/admin${path.slice(base.length)}`;
    }
  }
  return null;
};

const ssoStartPath = (strapi: any) => {
  const configured = process.env.ADMIN_SSO_START_PATH;
  if (configured) return configured;

  try {
    const adminUrl = new URL(strapi.config.get('admin.url'));
    return adminUrl.pathname.replace(/\/admin\/?$/, '/strapi-plugin-sso/azuread');
  } catch {
    const adminPath = normalisePath(
      strapi.config.get('admin.path', '/admin') || '/admin'
    );
    return `${adminPath.replace(/\/admin\/?$/, '')}/strapi-plugin-sso/azuread`;
  }
};

export default (_config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    if (!isEnabled()) {
      return next();
    }

    const path = normalisePath(ctx.path);
    const variants = adminPathVariants(strapi);
    const relative = relativeAdminPath(path, variants);

    if (!relative) {
      return next();
    }

    // Password login and self-service account creation are disabled when SSO
    // is enforced. Refresh/access-token endpoints stay available because the
    // SSO plugin uses them to maintain the session.
    if (LOCAL_AUTH_PATHS.has(relative) && ctx.method === 'POST') {
      return ctx.forbidden(
        'Password login is disabled. Sign in with your institutional Microsoft account.'
      );
    }

    // Send unauthenticated admin visits straight to the SSO entry point instead
    // of showing Strapi's local login form.
    const isLandingPage = ADMIN_LANDING_PATHS.has(relative);
    const isRead = ctx.method === 'GET' || ctx.method === 'HEAD';
    const hasAdminSession = Boolean(ctx.cookies.get('strapi_admin_refresh'));

    if (isLandingPage && isRead && !hasAdminSession) {
      return ctx.redirect(ssoStartPath(strapi));
    }

    return next();
  };
};
