/**
 * Minimal OIDC authorization-code flow with PKCE.
 *
 * Works with Microsoft Entra ID, Keycloak, and other standards-compliant
 * OIDC providers. We deliberately verify the ID token locally against the
 * provider's JWKS before trusting any claim.
 */

import { Buffer } from "node:buffer";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

const METADATA_TTL_MS = 60 * 60 * 1000;
const metadataCache = new Map();
const jwksCache = new Map();

export class AuthFlowError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
    this.cause = cause;
  }
}

const trim = (value) => (typeof value === "string" ? value.trim() : "");
const normaliseIssuer = (value) => trim(value).replace(/\/+$/, "");

function requiredEndpoint(metadata, key) {
  const value = trim(metadata?.[key]);
  if (!value) {
    throw new AuthFlowError(
      "config",
      `The identity provider metadata is missing ${key}`
    );
  }
  return value;
}

export async function getOidcMetadata(config) {
  const cached = metadataCache.get(config.issuer);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const discoveryUrl = new URL(
    ".well-known/openid-configuration",
    `${config.issuer}/`
  );

  let response;
  try {
    response = await fetch(discoveryUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    throw new AuthFlowError(
      "config",
      `Could not reach the identity provider at ${discoveryUrl}`,
      error
    );
  }

  if (!response.ok) {
    throw new AuthFlowError(
      "config",
      `Identity provider discovery failed with HTTP ${response.status}`
    );
  }

  const metadata = await response.json();
  if (normaliseIssuer(metadata.issuer) !== config.issuer) {
    throw new AuthFlowError(
      "config",
      `Identity provider issuer mismatch: expected ${config.issuer}, got ${metadata.issuer}`
    );
  }

  requiredEndpoint(metadata, "authorization_endpoint");
  requiredEndpoint(metadata, "token_endpoint");
  requiredEndpoint(metadata, "jwks_uri");

  metadataCache.set(config.issuer, {
    value: metadata,
    expiresAt: Date.now() + METADATA_TTL_MS,
  });
  return metadata;
}

export function createRandomToken() {
  return randomBytes(32).toString("base64url");
}

export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function buildAuthorizationUrl({
  config,
  metadata,
  state,
  nonce,
  codeChallenge,
}) {
  const url = new URL(requiredEndpoint(metadata, "authorization_endpoint"));
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (config.prompt) url.searchParams.set("prompt", config.prompt);
  return url;
}

export async function exchangeAuthorizationCode({
  config,
  metadata,
  code,
  codeVerifier,
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });

  const headers = {
    accept: "application/json",
    "content-type": "application/x-www-form-urlencoded",
  };

  const tokenAuthMethod = config.tokenAuthMethod || "client_secret_post";

  if (config.clientSecret && tokenAuthMethod === "client_secret_basic") {
    // Keycloak (and other providers) can be configured to accept only HTTP
    // Basic client authentication at the token endpoint.
    headers.authorization = `Basic ${Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString("base64")}`;
  } else if (config.clientSecret && tokenAuthMethod !== "none") {
    body.set("client_secret", config.clientSecret);
  }

  const response = await fetch(requiredEndpoint(metadata, "token_endpoint"), {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const detail = payload?.error_description || payload?.error || response.status;
    throw new AuthFlowError(
      "auth",
      `Token exchange failed: ${detail}`
    );
  }
  if (payload.error) {
    throw new AuthFlowError(
      "auth",
      `Token exchange failed: ${payload.error_description || payload.error}`
    );
  }
  return payload;
}

function jwksFor(metadata) {
  const uri = requiredEndpoint(metadata, "jwks_uri");
  if (!jwksCache.has(uri)) {
    jwksCache.set(uri, createRemoteJWKSet(new URL(uri)));
  }
  return jwksCache.get(uri);
}

export async function verifyIdToken({ config, metadata, tokens, nonce }) {
  if (!tokens.id_token) {
    throw new AuthFlowError("auth", "The identity provider did not return an ID token");
  }

  let payload;
  try {
    const result = await jwtVerify(tokens.id_token, jwksFor(metadata), {
      issuer: metadata.issuer,
      audience: config.clientId,
      clockTolerance: 60,
    });
    payload = result.payload;
  } catch (error) {
    throw new AuthFlowError("auth", "The ID token could not be verified", error);
  }

  if (!payload.nonce || payload.nonce !== nonce) {
    throw new AuthFlowError("auth", "The ID token nonce does not match");
  }
  return payload;
}

async function fetchUserInfo({ metadata, tokens }) {
  const endpoint = trim(metadata.userinfo_endpoint);
  if (!endpoint || !tokens.access_token) return null;

  try {
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${tokens.access_token}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function pickEmail(claims, profile) {
  const candidates = [
    profile?.email,
    claims.email,
    profile?.preferred_username,
    claims.preferred_username,
    profile?.upn,
    claims.upn,
  ];

  for (const candidate of candidates) {
    const email = trim(candidate).toLowerCase();
    if (isEmail(email)) return email;
  }
  return "";
}

function matchesAllowedDomain(email, allowedDomains) {
  if (allowedDomains.length === 0) return true;
  const domain = email.split("@")[1];
  if (!domain) return false;

  return allowedDomains.some((allowed) => {
    const normalised = allowed.replace(/^\./, "");
    return domain === normalised || domain.endsWith(`.${normalised}`);
  });
}

const normaliseGroup = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

function listClaim(value) {
  if (Array.isArray(value)) {
    return value.map(normaliseGroup).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[\s,]+/).map(normaliseGroup).filter(Boolean);
  }
  return [];
}

export async function resolveAuthenticatedUser({
  config,
  metadata,
  tokens,
  claims,
}) {
  const profile = await fetchUserInfo({ metadata, tokens });
  const email = pickEmail(claims, profile);

  if (!email) {
    throw new AuthFlowError(
      "domain",
      `The ${config.providerName || "identity provider"} account did not expose an email address. Ask the identity team to include the email claim.`
    );
  }

  if (!matchesAllowedDomain(email, config.allowedEmailDomains)) {
    throw new AuthFlowError(
      "domain",
      `The account ${email} is not in an allowed domain`
    );
  }

  if (claims._claim_names?.groups || profile?._claim_names?.groups) {
    throw new AuthFlowError(
      "group",
      "The identity provider did not include the groups claim (group overage). Configure the client to emit groups or use a smaller group."
    );
  }

  const groups = Array.from(
    new Set([
      ...listClaim(claims.groups),
      ...listClaim(profile?.groups),
    ])
  );

  const allowedGroups = (config.allowedGroups || config.allowedGroupIds || [])
    .map(normaliseGroup)
    .filter(Boolean);

  if (
    allowedGroups.length > 0 &&
    !allowedGroups.some((groupId) => groups.includes(groupId))
  ) {
    throw new AuthFlowError(
      "group",
      "The account is not a member of an allowed group"
    );
  }

  const givenName = trim(profile?.given_name || claims.given_name);
  const familyName = trim(profile?.family_name || claims.family_name);
  const displayName =
    trim(profile?.name || claims.name) ||
    [givenName, familyName].filter(Boolean).join(" ") ||
    email;

  const subject = trim(claims.oid || claims.sub);
  if (!subject) {
    throw new AuthFlowError("auth", "The ID token did not contain a subject");
  }

  return {
    sub: subject,
    email,
    name: displayName,
    givenName: givenName || displayName,
    familyName,
    groups,
  };
}
