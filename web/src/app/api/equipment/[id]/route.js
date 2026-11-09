import { NextResponse } from "next/server";
import { getEquipmentAssetById } from "@/lib/snipeit";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const equipment = await getEquipmentAssetById(id);

    return NextResponse.json(equipment);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
