import { NextResponse } from "next/server";
import { getEquipmentAssetById, SnipeitError } from "@/lib/snipeit";

export const dynamic = "force-dynamic";

const NUMERIC_ID = /^\d+$/;

export async function GET(request, { params }) {
  const { id } = await params;

  if (!NUMERIC_ID.test(id)) {
    return NextResponse.json(
      { error: "Equipment not found" },
      { status: 404 }
    );
  }

  try {
    const equipment = await getEquipmentAssetById(id);

    if (!equipment?.id) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(equipment, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    if (err instanceof SnipeitError && err.status === 404) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    console.error(`Could not load equipment ${id}`, err);
    return NextResponse.json(
      { error: "Could not load equipment" },
      { status: 502 }
    );
  }
}
