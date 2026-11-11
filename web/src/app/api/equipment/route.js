import { NextResponse } from "next/server";
import { getEquipmentAssets } from "@/lib/snipeit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const equipment = await getEquipmentAssets();

    return NextResponse.json(equipment, {
      headers: {
        // The catalog is public, but keep the cache short so status changes
        // (available / checked out) show up promptly.
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Could not load equipment", err);
    return NextResponse.json(
      { error: "Could not load equipment" },
      { status: 502 }
    );
  }
}
