import { NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getAuthConfig,
  getAuthPublicBaseUrl,
} from "@/lib/auth/config";
import { buildAuthorizationUrl, createPkcePair, createRandomToken, getOidcMetadata } from "@/lib/auth/oidc";
import {
  OIDC_COOKIE,
  oidcCookieOptions,
  safeReturnTo,
  sealOidcTransaction,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function loginErrorRedirect(code) {
  const url = new URL("/login", getAuthPublicBaseUrl());
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function GET(request) {
  let config;
  try {
    config = getAuthConfig();
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return loginErrorRedirect("config");
    }
    console.error("Auth login configuration failed", error);
    return loginErrorRedirect("config");
  }

  try {
    const metadata = await getOidcMetadata(config);
    const state = createRandomToken();
    const nonce = createRandomToken();
    const { verifier, challenge } = createPkcePair();

    const returnTo = safeReturnTo(
      new URL(request.url).searchParams.get("returnTo"),
      "/"
    );

    const transaction = await sealOidcTransaction({
      state,
      nonce,
      codeVerifier: verifier,
      returnTo,
    });

    const authorizationUrl = buildAuthorizationUrl({
      config,
      metadata,
      state,
      nonce,
      codeChallenge: challenge,
    });

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(OIDC_COOKIE, transaction, oidcCookieOptions());
    return response;
  } catch (error) {
    console.error("Could not start institutional sign-in", error);
    return loginErrorRedirect("config");
  }
}
