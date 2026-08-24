import { NextResponse } from "next/server";
import { createReservation, getAllReservations, hasOverlappingReservation } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAllReservations());
}

export async function POST(request) {
  const body = await request.json();
  const { assetId, assetName, userEmail, userFirstName, userLastName, startDate, endDate } = body;

  if (!assetId || !userEmail || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isOverlapping = await hasOverlappingReservation(assetId, startDate, endDate);
  
  if (isOverlapping) {
    return NextResponse.json({ error: "This equipment is already reserved for the selected period" }, { status: 409 });
  }

  
  const reservation = await createReservation({ 
    assetId, assetName, userEmail, userFirstName, userLastName, startDate, endDate 
  });
  
  return NextResponse.json(reservation, { status: 201 });
}