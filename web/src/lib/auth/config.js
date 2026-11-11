/**
 * Server-only configuration for the institutional Microsoft/OIDC login.
 *
 * The site can talk directly to Microsoft Entra ID (the usual UTCN setup) or
 * to an OIDC broker run by the university. Set AUTH_OIDC_ISSUER for a broker,
 * or AUTH_MICROSOFT_TENANT_ID for Entra ID.
 */

export class AuthConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

const clean = (value) => (typeof value === "string" ? value.trim() : "");

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return "";
};

const parseList = (value) =>
  clean(value)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export function getAuthPublicBaseUrl() {
  const configured = firstNonEmpty(
    process.env.AUTH_URL,
    process.env.CLIENT_URL,
    process.env.NEXT_PUBLIC_SITE_URL
  );

  if (!configured) return "http://localhost:3000";

  try {
    const url = new URL(configured);
    // Remove any accidental trailing slash. Path prefixes are preserved so the
    // app can also be hosted under a subpath.
    return url.toString().replace(/\/+$/, "");
  } catch {
    return configured.replace(/\/+$/, "");
  }
}

export function getAuthConfig() {
  const issuer = firstNonEmpty(
    process.env.AUTH_OIDC_ISSUER,
    process.env.AUTH_MICROSOFT_TENANT_ID
      ? `https://login.microsoftonline.com/${clean(
          process.env.AUTH_MICROSOFT_TENANT_ID
        )}/v2.0`
      : ""
  );

  const clientId = firstNonEmpty(
    process.env.AUTH_CLIENT_ID,
    process.env.AUTH_MICROSOFT_CLIENT_ID
  );
  const clientSecret = firstNonEmpty(
    process.env.AUTH_CLIENT_SECRET,
    process.env.AUTH_MICROSOFT_CLIENT_SECRET
  );
  const secret = firstNonEmpty(process.env.AUTH_SECRET);

  const missing = [];
  if (!issuer) missing.push("AUTH_OIDC_ISSUER or AUTH_MICROSOFT_TENANT_ID");
  if (!clientId) missing.push("AUTH_CLIENT_ID or AUTH_MICROSOFT_CLIENT_ID");
  if (!secret) missing.push("AUTH_SECRET");

  if (missing.length > 0) {
    throw new AuthConfigurationError(
      `Missing authentication configuration: ${missing.join(", ")}`
    );
  }

  const baseUrl = getAuthPublicBaseUrl();
  const redirectUri =
    firstNonEmpty(process.env.AUTH_REDIRECT_URI) ||
    new URL("/api/auth/callback", `${baseUrl}/`).toString();

  const sessionHours = Number(process.env.AUTH_SESSION_MAX_AGE_HOURS || 12);
  const sessionMaxAgeSeconds =
    Number.isFinite(sessionHours) && sessionHours > 0
      ? Math.floor(sessionHours * 60 * 60)
      : 12 * 60 * 60;

  return {
    secret,
    issuer: issuer.replace(/\/+$/, ""),
    clientId,
    // Public clients (PKCE, no secret) are supported by leaving this empty.
    clientSecret,
    redirectUri,
    scopes: firstNonEmpty(process.env.AUTH_SCOPES, "openid profile email"),
    baseUrl,
    sessionMaxAgeSeconds,
    // Empty means "do not apply an extra domain filter". Entra ID tenant
    // restrictions still apply.
    allowedEmailDomains: parseList(process.env.AUTH_ALLOWED_EMAIL_DOMAINS),
    allowedGroupIds: parseList(process.env.AUTH_ALLOWED_GROUP_IDS),
    prompt: clean(process.env.AUTH_PROMPT),
  };
}

export function isAuthConfigured() {
  try {
    getAuthConfig();
    return true;
  } catch {
    return false;
  }
}
