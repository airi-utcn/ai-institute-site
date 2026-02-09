import { revalidatePath, revalidateTag } from "next/cache";

const MODEL_PATH_MAP = {
  "api::person.person": [
    "/people",
    "/research/departments",
  ],
  // To add here more, to be updated on webook receive. 
  "api::project.project": ["/research/projects", "/research/departments", "/engagement/industry"],
  "api::department.department": ["/research/departments"],
  "api::research-theme.research-theme": ["/research/themes"],
  "api::news-article.news-article": ["/news&events/news"],
  "api::publication.publication": ["/research/publications", "/research/departments"],
  "api::support-unit.support-unit": ["/research/departments"],
};

const DEFAULT_PATHS = ["/"];

export async function GET(req) {
  const url = new URL(req.url);
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Use POST",
      hint: "This endpoint expects POST with ?secret=... (or header x-revalidate-secret).",
      example: `${url.origin}${url.pathname}?secret=YOUR_REVALIDATION_SECRET`,
    }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}

function derivePathsFromPayload(payload) {
  if (!payload || typeof payload !== "object") return [];
  const model = payload.model || payload?.data?.model;
  const entry = payload.entry || payload?.data?.entry || payload?.data;

  const paths = MODEL_PATH_MAP[model] ? [...MODEL_PATH_MAP[model]] : [];

  // If we ever add slug-based detail pages, append them here using entry?.slug.
  return paths;
}

async function revalidateItems({ paths = [], tags = [] }) {
  const dedupedPaths = Array.from(new Set(paths.filter(Boolean)));
  const dedupedTags = Array.from(new Set(tags.filter(Boolean)));

  for (const p of dedupedPaths) {
    revalidatePath(p);
  }

  for (const t of dedupedTags) {
    revalidateTag(t);
  }

  return { paths: dedupedPaths, tags: dedupedTags };
}

export async function POST(req) {
  try {
    const ALLOWED_SECRET = process.env.REVALIDATION_SECRET;
    if (!ALLOWED_SECRET) {
      console.error("Revalidate: REVALIDATION_SECRET not set");
      return new Response(JSON.stringify({ error: "REVALIDATION_SECRET not set" }), { status: 500 });
    }

    const url = new URL(req.url);
    const secret = url.searchParams.get("secret") || req.headers.get("x-revalidate-secret");
    if (secret !== ALLOWED_SECRET) {
      console.warn("Revalidate: unauthorized", {
        path: url.pathname,
        hasSecretParam: url.searchParams.has("secret"),
        hasHeader: !!req.headers.get("x-revalidate-secret"),
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    console.info("Revalidate: accepted", { path: url.pathname });

    const body = await req.json().catch(() => ({}));
    const explicitPaths = body.paths || (body.path ? [body.path] : []);
    const explicitTags = body.tags || [];

    const inferredPaths = derivePathsFromPayload(body) || [];
    const targets = explicitPaths.length || inferredPaths.length ? [...explicitPaths, ...inferredPaths] : DEFAULT_PATHS;

    const { paths, tags } = await revalidateItems({ paths: targets, tags: explicitTags });

    return new Response(
      JSON.stringify({ revalidated: true, paths, tags, inferred: inferredPaths }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Revalidate webhook error", error);
    return new Response(JSON.stringify({ error: error?.message || "Revalidate failed" }), { status: 500 });
  }
}
