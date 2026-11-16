import { NextResponse } from "next/server";
import { getEnv, normalizeBaseUrl, requireEnv } from "@/lib/env";
import { validateNewsletterInput } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

// per-IP limit kept in memory, it resets when the server restarts
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const requests = new Map();

function tooManyRequests(ip) {
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  requests.set(ip, recent);

  if (requests.size > 5000) requests.clear();
  return recent.length > MAX_REQUESTS;
}

function strapiUrl() {
  return normalizeBaseUrl(
    getEnv("STRAPI_INTERNAL_URL", "STRAPI_URL") ||
      requireEnv(["NEXT_PUBLIC_STRAPI_URL", "PUBLIC_STRAPI_URL"])
  );
}

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (tooManyRequests(ip)) {
    return NextResponse.json({ code: "rate_limited" }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_request" }, { status: 400 });
  }

  // the form has a hidden "website" field that only bots fill in
  if (body?.website) {
    return NextResponse.json({ status: "subscribed" }, { status: 201 });
  }

  const check = validateNewsletterInput({ email: body?.email, consent: body?.consent });
  if (!check.ok) {
    return NextResponse.json({ code: check.code }, { status: 400 });
  }

  let response;
  try {
    response = await fetch(`${strapiUrl()}/api/newsletter-subscribers/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          email: check.email,
          consentGiven: true,
          source: String(body?.source ?? "").slice(0, 64),
        },
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Newsletter signup: Strapi is not reachable", error);
    return NextResponse.json({ code: "server_error" }, { status: 502 });
  }

  if (response.status === 201) return NextResponse.json({ status: "subscribed" }, { status: 201 });
  if (response.status === 200) return NextResponse.json({ status: "already_subscribed" });

  console.error("Newsletter signup: Strapi answered with", response.status);
  return NextResponse.json({ code: "server_error" }, { status: 502 });
}
