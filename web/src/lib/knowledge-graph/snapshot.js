import { getPreviewSession } from '@/lib/preview-session';
import { getKnowledgeGraphSource } from '@/lib/strapi';
import { buildKnowledgeGraph } from './model';

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

let cache = {
  graph: null,
  expiresAt: 0,
};
let inFlight = null;

async function buildSnapshot() {
  const source = await getKnowledgeGraphSource();
  return buildKnowledgeGraph(source);
}

/**
 * Return the cached graph projection, rebuilding it at most once per TTL.
 *
 * Preview sessions must never see a shared/public snapshot: they bypass the
 * cache and include drafts through the normal Strapi request path. This mirrors
 * the `/api/search-index` behavior.
 */
export async function getKnowledgeGraphSnapshot() {
  const previewSession = await getPreviewSession();

  if (!previewSession && cache.graph && Date.now() < cache.expiresAt) {
    return { graph: cache.graph, preview: false };
  }

  if (previewSession) {
    return { graph: await buildSnapshot(), preview: true };
  }

  // Collapse concurrent cold requests into one Strapi crawl + graph build.
  if (!inFlight) {
    inFlight = buildSnapshot().finally(() => {
      inFlight = null;
    });
  }

  const graph = await inFlight;

  // Do not cache a transient empty/failed build for five minutes.
  if (graph.nodes?.length) {
    cache = {
      graph,
      expiresAt: Date.now() + SNAPSHOT_TTL_MS,
    };
  }

  return { graph, preview: false };
}

export function clearKnowledgeGraphSnapshot() {
  cache = { graph: null, expiresAt: 0 };
}
