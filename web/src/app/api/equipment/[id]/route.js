import { NextResponse } from "next/server";
import { getAssetById } from "@/lib/snipeit";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const asset = await getAssetById(id);
    return NextResponse.json({
      id: asset.id,
      name: asset.name || asset.model?.name || asset.asset_tag || "Unnamed",
      status: asset.status_label?.name,
      available: asset.status_label?.status_meta === "deployable",
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}