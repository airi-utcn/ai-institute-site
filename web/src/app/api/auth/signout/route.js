import { NextResponse } from "next/server";
import { getAuthPublicBaseUrl } from "@/lib/auth/config";
import { OIDC_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const baseUrl = getAuthPublicBaseUrl();
  const secure = baseUrl.startsWith("https://");
  const response = NextResponse.redirect(new URL("/", baseUrl));
  const expired = {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(SESSION_COOKIE, "", expired);
  response.cookies.set(OIDC_COOKIE, "", expired);
  return response;
}
