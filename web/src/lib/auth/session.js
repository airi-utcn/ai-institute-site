/**
 * Encrypted, stateless session helpers for the public site.
 *
 * Only the claims needed by the reservation flow are stored. The OAuth access
 * and ID tokens are never written to the browser.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EncryptJWT, jwtDecrypt } from "jose";
import { getAuthConfig } from "./config";

export const SESSION_COOKIE = "airi_session";
export const OIDC_COOKIE = "airi_oidc";
export const OIDC_COOKIE_PATH = "/api/auth";

const SESSION_PURPOSE = "session";
const OIDC_PURPOSE = "oidc";

function sessionKey(secret) {
  // jose's "dir" + A256GCM needs exactly 32 bytes. Deriving with SHA-256 lets
  // operators provide any sufficiently random secret.
  return new Uint8Array(createHash("sha256").update(secret).digest());
}

function baseCookieOptions(config, maxAge) {
  return {
    httpOnly: true,
    secure: config.baseUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function sessionCookieOptions(config) {
  return baseCookieOptions(config, config.sessionMaxAgeSeconds);
}

export function oidcCookieOptions() {
  return {
    httpOnly: true,
    secure: getAuthConfig().baseUrl.startsWith("https://"),
    sameSite: "lax",
    path: OIDC_COOKIE_PATH,
    maxAge: 10 * 60,
  };
}

async function encrypt(payload, secret, expiresIn) {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .encrypt(sessionKey(secret));
}

async function decrypt(token, secret) {
  const { payload } = await jwtDecrypt(token, sessionKey(secret), {
    clockTolerance: 30,
  });
  return payload;
}

export async function createSessionToken(user, config) {
  return encrypt(
    {
      purpose: SESSION_PURPOSE,
      sub: user.sub,
      email: user.email,
      name: user.name,
      givenName: user.givenName,
      familyName: user.familyName,
      groups: user.groups,
    },
    config.secret,
    `${config.sessionMaxAgeSeconds}s`
  );
}

export async function getSession() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  let config;
  try {
    config = getAuthConfig();
  } catch {
    return null;
  }

  try {
    const payload = await decrypt(raw, config.secret);
    if (payload.purpose !== SESSION_PURPOSE || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireUser(returnTo = "/") {
  const session = await getSession();
  if (!session) {
    const target = safeReturnTo(returnTo, "/");
    redirect(`/login?returnTo=${encodeURIComponent(target)}`);
  }
  return session;
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function sealOidcTransaction(transaction) {
  const config = getAuthConfig();
  return encrypt(
    { purpose: OIDC_PURPOSE, ...transaction },
    config.secret,
    "10m"
  );
}

export async function unsealOidcTransaction(token) {
  const config = getAuthConfig();
  const payload = await decrypt(token, config.secret);
  if (payload.purpose !== OIDC_PURPOSE) {
    throw new Error("Invalid OIDC transaction");
  }
  return payload;
}

export function safeReturnTo(value, fallback = "/") {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "http://local.invalid");
    if (parsed.origin !== "http://local.invalid") return fallback;
    if (parsed.pathname.startsWith("/api/auth")) return fallback;
    if (parsed.pathname === "/login") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
