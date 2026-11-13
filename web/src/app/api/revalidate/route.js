import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

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
  "api::event.event": ["/news&events/events"],
  "api::seminar.seminar": ["/news&events/seminars"],
  "api::publication.publication": ["/research/publications", "/research/departments"],
};

const DEFAULT_PATHS = ["/"];

export async function GET(req) {
  const url = new URL(req.url);
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Use POST",
      hint: "Send POST with the x-revalidate-secret header. The ?secret= query parameter is no longer accepted by default.",
      example: `curl -X POST -H "x-revalidate-secret: $REVALIDATION_SECRET" ${url.origin}${url.pathname}`,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}

function isSafePath(value) {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("..") &&
    !value.includes("\\") &&
    !value.includes("?") &&
    !value.includes("#")
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
    const headerSecret = req.headers.get("x-revalidate-secret") || "";
    const querySecret = url.searchParams.get("secret") || "";
    // Query strings end up in proxy logs and browser history. Keep the escape
    // hatch only for an old webhook that has not been migrated yet.
    const allowQuerySecret = process.env.REVALIDATION_ALLOW_QUERY_SECRET === "true";
    const secret = headerSecret || (allowQuerySecret ? querySecret : "");

    if (!safeEqual(secret, ALLOWED_SECRET)) {
      console.warn("Revalidate: unauthorized", {
        path: url.pathname,
        hasSecretParam: url.searchParams.has("secret"),
        hasHeader: !!headerSecret,
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (!headerSecret && querySecret) {
      console.warn(
        "Revalidate: accepted a ?secret= query parameter. Move it to the x-revalidate-secret header."
      );
    }

    console.info("Revalidate: accepted", { path: url.pathname });

    const rawBody = await req.json().catch(() => ({}));
    const body = rawBody && typeof rawBody === "object" && !Array.isArray(rawBody) ? rawBody : {};
    const explicitPaths = (
      Array.isArray(body.paths) ? body.paths : body.path ? [body.path] : []
    ).filter(isSafePath);
    const explicitTags = (
      Array.isArray(body.tags) ? body.tags : body.tags ? [body.tags] : []
    ).filter((tag) => typeof tag === "string" && tag.length > 0 && tag.length <= 200);

    const inferredPaths = derivePathsFromPayload(body) || [];
    const targets = explicitPaths.length || inferredPaths.length ? [...explicitPaths, ...inferredPaths] : DEFAULT_PATHS;

    const { paths, tags } = await revalidateItems({ paths: targets, tags: explicitTags });

    return new Response(
      JSON.stringify({ revalidated: true, paths, tags, inferred: inferredPaths }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Revalidate webhook error", error);
    return new Response(JSON.stringify({ error: error?.message || "Revalidate failed" }), { status: 500 });
  }
}
