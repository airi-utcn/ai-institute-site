import { NextResponse } from "next/server";
import { getAuthPublicBaseUrl } from "@/lib/auth/config";
import { OIDC_COOKIE, OIDC_COOKIE_PATH, SESSION_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const baseUrl = getAuthPublicBaseUrl();
  const secure = baseUrl.startsWith("https://");
  const response = NextResponse.redirect(new URL("/", baseUrl), 303);
  const expired = {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(SESSION_COOKIE, "", expired);
  response.cookies.set(OIDC_COOKIE, "", { ...expired, path: OIDC_COOKIE_PATH });
  return response;
}
