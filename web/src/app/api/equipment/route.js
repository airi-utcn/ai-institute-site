import { NextResponse } from "next/server";
import { getEquipmentAssets } from "@/lib/snipeit";

export async function GET() {
  try {
    const equipment = await getEquipmentAssets();

    return NextResponse.json(equipment);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
