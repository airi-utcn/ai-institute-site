import { NextResponse } from "next/server";
import { getEquipmentAssetById } from "@/lib/snipeit";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    if (!/^[0-9]+$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid id' },
        { status: 400 }
      );
    }

    const equipment = await getEquipmentAssetById(id);

    return NextResponse.json(equipment);
    } catch (err) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
  }
}
