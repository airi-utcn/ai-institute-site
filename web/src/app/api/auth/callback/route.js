import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getAuthConfig,
  getAuthPublicBaseUrl,
} from "@/lib/auth/config";
import {
  AuthFlowError,
  exchangeAuthorizationCode,
  getOidcMetadata,
  resolveAuthenticatedUser,
  verifyIdToken,
} from "@/lib/auth/oidc";
import {
  OIDC_COOKIE,
  SESSION_COOKIE,
  createSessionToken,
  oidcCookieOptions,
  safeEqual,
  safeReturnTo,
  sessionCookieOptions,
  unsealOidcTransaction,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function redirectToLogin(code) {
  const url = new URL("/login", getAuthPublicBaseUrl());
  url.searchParams.set("error", code);
  const response = NextResponse.redirect(url);
  response.cookies.set(OIDC_COOKIE, "", {
    ...oidcCookieOptions(),
    maxAge: 0,
  });
  return response;
}

function mapError(error) {
  if (error instanceof AuthConfigurationError) return "config";
  if (error instanceof AuthFlowError) return error.code || "auth";
  return "auth";
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const providerError = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const transactionCookie = (await cookies()).get(OIDC_COOKIE)?.value;
  if (!transactionCookie) {
    return redirectToLogin("state");
  }

  let transaction;
  try {
    transaction = await unsealOidcTransaction(transactionCookie);
  } catch {
    return redirectToLogin("state");
  }

  if (!state || !safeEqual(state, transaction.state)) {
    return redirectToLogin("state");
  }

  if (providerError) {
    console.warn("Institutional sign-in was rejected", providerError);
    return redirectToLogin("access_denied");
  }

  if (!code) {
    return redirectToLogin("auth");
  }

  let config;
  try {
    config = getAuthConfig();
  } catch (error) {
    console.error("Auth callback configuration failed", error);
    return redirectToLogin("config");
  }

  try {
    const metadata = await getOidcMetadata(config);
    const tokens = await exchangeAuthorizationCode({
      config,
      metadata,
      code,
      codeVerifier: transaction.codeVerifier,
    });
    const claims = await verifyIdToken({
      config,
      metadata,
      tokens,
      nonce: transaction.nonce,
    });
    const user = await resolveAuthenticatedUser({
      config,
      metadata,
      tokens,
      claims,
    });

    const session = await createSessionToken(user, config);
    const returnTo = safeReturnTo(transaction.returnTo, "/");

    const response = NextResponse.redirect(new URL(returnTo, config.baseUrl));
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(config));
    response.cookies.set(OIDC_COOKIE, "", {
      ...oidcCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("Institutional sign-in failed", error);
    return redirectToLogin(mapError(error));
  }
}
