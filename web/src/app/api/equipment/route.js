import { NextResponse } from "next/server";
import { getAllAssets } from "@/lib/snipeit";

export async function GET() {
  try {
    const assets = await getAllAssets();

    const simplified = assets.map((a) => ({
      id: a.id,
      name: a.name || a.model?.name || a.asset_tag || "Unnamed",
      status: a.status_label?.name,
      available: a.status_label?.status_meta === "deployable",
    }));

    return NextResponse.json(simplified);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}