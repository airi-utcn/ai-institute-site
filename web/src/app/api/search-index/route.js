import { buildSearchIndex } from "@/lib/search-index";
import { getPreviewSession } from "@/lib/preview-session";

const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;

// The index is expensive to rebuild. Keep a per-process public copy so making
// the route preview-aware does not make every search page crawl Strapi.
let publicIndexCache = { data: null, expiresAt: 0 };

export async function GET() {
  try {
    const previewSession = await getPreviewSession();

    if (
      !previewSession &&
      publicIndexCache.data &&
      Date.now() < publicIndexCache.expiresAt
    ) {
      return Response.json(publicIndexCache.data, {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    const index = await buildSearchIndex();

    if (!previewSession) {
      publicIndexCache = {
        data: index,
        expiresAt: Date.now() + PUBLIC_CACHE_TTL_MS,
      };
    }

    return Response.json(index, {
      headers: {
        // A preview session can include drafts. Never let a shared cache
        // store or serve that response to the public.
        "Cache-Control": previewSession
          ? "private, no-store"
          : "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[search-index] failed to build index", error);
    return Response.json([], { status: 500 });
  }
}
