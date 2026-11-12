import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createReservation,
  getReservationsByEmail,
  hasOverlappingReservation,
} from "@/lib/db";
import { getEquipmentAssetById, SnipeitError } from "@/lib/snipeit";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_ID = /^\d+$/;

function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const reservations = await getReservationsByEmail(session.email);
    return NextResponse.json(reservations, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Could not load reservations", error);
    return NextResponse.json(
      { error: "Could not load reservations" },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const assetId =
    typeof body?.assetId === "string" || typeof body?.assetId === "number"
      ? String(body.assetId).trim()
      : "";
  const startDate = typeof body?.startDate === "string" ? body.startDate : "";
  const endDate = typeof body?.endDate === "string" ? body.endDate : "";

  if (
    !assetId ||
    !NUMERIC_ID.test(assetId) ||
    !isIsoDate(startDate) ||
    !isIsoDate(endDate)
  ) {
    return NextResponse.json(
      { error: "Missing or invalid required fields" },
      { status: 400 }
    );
  }

  if (endDate < startDate) {
    return NextResponse.json(
      { error: "End date must be after the start date" },
      { status: 400 }
    );
  }

  let asset;
  try {
    asset = await getEquipmentAssetById(assetId);
  } catch (error) {
    if (error instanceof SnipeitError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: "Equipment not found" },
          { status: 404 }
        );
      }
      if (error.status === 400) {
        return NextResponse.json(
          { error: "Invalid equipment" },
          { status: 400 }
        );
      }
    }

    console.error(`Could not verify equipment ${assetId}`, error);
    return NextResponse.json(
      { error: "Could not verify the selected equipment. Please try again." },
      { status: 502 }
    );
  }

  if (!asset?.id) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  try {
    const isOverlapping = await hasOverlappingReservation(
      assetId,
      startDate,
      endDate
    );

    if (isOverlapping) {
      return NextResponse.json(
        {
          error:
            "This equipment is already reserved for the selected period",
        },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("Could not check reservation availability", error);
    return NextResponse.json(
      { error: "Could not check availability. Please try again." },
      { status: 502 }
    );
  }

  try {
    const reservation = await createReservation({
      assetId,
      assetName: asset.name || "",
      assetTag: asset.tag || "",
      assetModel: asset.model || "",
      assetSerial: asset.serial || "",
      assetLocation: asset.roomNumber || "",
      assetImageUrl: asset.image || "",
      assetUrl: asset.url || "",
      userEmail: session.email,
      userFirstName: session.givenName || session.name || "",
      userLastName: session.familyName || "",
      userObjectId: session.sub,
      startDate,
      endDate,
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Could not create reservation", error);
    return NextResponse.json(
      { error: "Could not create the reservation. Please try again." },
      { status: 502 }
    );
  }
}
