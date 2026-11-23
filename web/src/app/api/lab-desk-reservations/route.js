import { NextResponse } from "next/server";
import { getAuthPublicBaseUrl } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { strapiRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

const STRAPI_PATH = "/api/lab-desk-reservations";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
const RESERVATION_ID = /^[a-zA-Z0-9_-]{1,128}$/;

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: PRIVATE_HEADERS });
}

function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin === null) return true;

  const publicUrl = getAuthPublicBaseUrl();
  return (
    origin === new URL(request.url).origin ||
    (URL.canParse(publicUrl) && origin === new URL(publicUrl).origin)
  );
}

function displayName(session) {
  const nameParts = [session.givenName, session.familyName].filter(
    (part) => typeof part === "string" && !part.includes("@")
  );
  const name = [session.name, nameParts.join(" ")].find(
    (candidate) =>
      typeof candidate === "string" &&
      candidate.trim() &&
      !candidate.includes("@")
  );
  return name?.trim().slice(0, 255) || "Researcher";
}

function publicReservation(reservation) {
  const { id, desk, startTime, endTime, bookedBy, mine } = reservation ?? {};
  if (
    typeof id !== "string" || !RESERVATION_ID.test(id) ||
    !Number.isInteger(desk) ||
    typeof startTime !== "string" || typeof endTime !== "string" ||
    typeof bookedBy !== "string" || typeof mine !== "boolean"
  ) {
    throw new Error("Strapi returned an invalid desk reservation");
  }

  return { id, desk, startTime, endTime, bookedBy, mine };
}

async function handleRequest(request, handler) {
  const session = await getSession();
  if (typeof session?.sub !== "string" || !session.sub.trim()) {
    return json({ error: "Institutional sign-in required." }, 401);
  }

  if (request.method !== "GET" && !isSameOrigin(request)) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  const requestStrapi = (suffix, options) =>
    strapiRequest(`${STRAPI_PATH}${suffix}`, {
      ...options,
      headers: { "x-airi-user-id": session.sub },
      redirect: "error",
    });

  try {
    return await handler(requestStrapi, session);
  } catch (error) {
    if ([400, 404, 409].includes(error?.status) && typeof error.detail === "string") {
      return json({ error: error.detail }, error.status);
    }

    console.error("Desk reservation request failed", error);
    return json({ error: "Desk reservations are temporarily unavailable." }, 502);
  }
}

export async function GET(request) {
  return handleRequest(request, async (requestStrapi) => {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams({
      laboratory: searchParams.get("laboratory") || "",
      date: searchParams.get("date") || "",
    });
    const schedule = await requestStrapi(`?${params}`);
    if (!Array.isArray(schedule?.reservations)) {
      throw new Error("Strapi returned an invalid desk schedule");
    }

    return json({ reservations: schedule.reservations.map(publicReservation) });
  });
}

export async function POST(request) {
  return handleRequest(request, async (requestStrapi, session) => {
    const contentType = request.headers.get("content-type")?.split(";")[0];
    if (contentType?.trim().toLowerCase() !== "application/json") {
      return json({ error: "Desk reservations require a JSON request." }, 415);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Invalid request body." }, 400);
    }

    const { laboratory, date, desk, startTime, endTime } = body;
    const result = await requestStrapi("", {
      method: "POST",
      body: JSON.stringify({
        laboratory,
        date,
        desk,
        startTime,
        endTime,
        bookedBy: displayName(session),
      }),
    });
    return json({ reservation: publicReservation(result?.reservation) }, 201);
  });
}

export async function DELETE(request) {
  return handleRequest(request, async (requestStrapi) => {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!RESERVATION_ID.test(id)) {
      return json({ error: "A valid reservation ID is required." }, 400);
    }

    await requestStrapi(`/${id}`, { method: "DELETE" });
    return new NextResponse(null, { status: 204, headers: PRIVATE_HEADERS });
  });
}
