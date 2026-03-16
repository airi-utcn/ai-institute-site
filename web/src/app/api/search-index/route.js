import { buildSearchIndex } from "@/lib/search-index";

export const revalidate = 300;

export async function GET() {
  try {
    const index = await buildSearchIndex();
    return Response.json(index, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[search-index] failed to build index", error);
    return Response.json([], { status: 500 });
  }
}