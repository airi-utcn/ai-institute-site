/**
 * One-time migration: Copy Paper entries into the Publication content type,
 * then re-point GraphLink source/target from Paper → Publication.
 *
 * Usage:
 *   cd server
 *   node scripts/migrate-papers-to-publications.js
 *
 * Requires env vars (or .env in project root):
 *   STRAPI_URL          – default http://localhost:1337
 *   STRAPI_API_TOKEN    – full-access API token
 */

const path = require("path");

// Load .env from project root
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const BASE = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/+$/, "");
const TOKEN = process.env.STRAPI_API_TOKEN;

if (!TOKEN) {
  console.error("Missing STRAPI_API_TOKEN in environment.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fetchAllPages(endpoint, params = "") {
  const results = [];
  let page = 1;
  while (true) {
    const sep = params ? "&" : "?";
    const url = `${BASE}/api/${endpoint}?${params}${sep}pagination[page]=${page}&pagination[pageSize]=100`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    const json = await res.json();
    const data = json.data ?? [];
    results.push(...data);
    const { pageCount } = json.meta?.pagination ?? {};
    if (!pageCount || page >= pageCount) break;
    page++;
  }
  return results;
}

async function createEntry(endpoint, data) {
  const url = `${BASE}/api/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST ${url} → ${res.status}: ${body}`);
  }
  return (await res.json()).data;
}

async function updateEntry(endpoint, documentId, data) {
  const url = `${BASE}/api/${endpoint}/${documentId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PUT ${url} → ${res.status}: ${body}`);
  }
  return (await res.json()).data;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching all papers...");
  const papers = await fetchAllPages(
    "papers",
    "fields[0]=openAlexId&fields[1]=title&fields[2]=doi&fields[3]=year&fields[4]=cited_by&fields[5]=abstract&fields[6]=topics&fields[7]=authors&fields[8]=pdf_url"
  );
  console.log(`  Found ${papers.length} papers.`);

  console.log("Fetching existing publications (for dedup)...");
  const existingPubs = await fetchAllPages(
    "publications",
    "fields[0]=openAlexId&fields[1]=title&fields[2]=doi"
  );

  // Build lookup indices
  const pubByOA = {};
  const pubByTitle = {};
  for (const pub of existingPubs) {
    const attr = pub.attributes ?? pub;
    if (attr.openAlexId) pubByOA[attr.openAlexId] = pub;
    if (attr.title) pubByTitle[attr.title.toLowerCase().trim()] = pub;
  }

  // Map: paper documentId → publication documentId
  const paperToPub = {};
  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const paper of papers) {
    const attr = paper.attributes ?? paper;
    const paperId = paper.documentId ?? paper.id;
    const oaId = attr.openAlexId;
    const title = attr.title;

    // Check if already migrated
    let existingPub = oaId ? pubByOA[oaId] : null;
    if (!existingPub && title) {
      existingPub = pubByTitle[title.toLowerCase().trim()];
    }

    if (existingPub) {
      const pubId = existingPub.documentId ?? existingPub.id;
      paperToPub[paperId] = pubId;

      // Backfill openAlexId if the publication was manually created
      const existingAttr = existingPub.attributes ?? existingPub;
      if (oaId && !existingAttr.openAlexId) {
        await updateEntry("publications", pubId, {
          openAlexId: oaId,
          doi: attr.doi || undefined,
          cited_by: attr.cited_by ?? undefined,
          abstract: attr.abstract || undefined,
          topics: attr.topics || undefined,
        });
        console.log(`  ↻ Updated existing publication: ${title}`);
        linked++;
      } else {
        console.log(`  ⊘ Already exists: ${title}`);
        skipped++;
      }
      continue;
    }

    // Create new publication from paper
    try {
      const newPub = await createEntry("publications", {
        title: title,
        openAlexId: oaId,
        doi: attr.doi || undefined,
        year: attr.year ?? undefined,
        cited_by: attr.cited_by ?? 0,
        abstract: attr.abstract || undefined,
        topics: attr.topics || undefined,
      });
      const pubId = newPub.documentId ?? newPub.id;
      paperToPub[paperId] = pubId;
      console.log(`  ✓ Created: ${title}`);
      created++;
    } catch (err) {
      console.error(`  ✗ Failed to create publication for "${title}": ${err.message}`);
    }
  }

  console.log(`\nPapers migration: ${created} created, ${linked} updated, ${skipped} skipped.\n`);

  // Re-point graph links
  console.log("Fetching graph links...");
  const graphLinks = await fetchAllPages(
    "graph-links",
    "populate[source][fields][0]=documentId&populate[target][fields][0]=documentId&fields[0]=score"
  );
  console.log(`  Found ${graphLinks.length} graph links.`);

  let linksMigrated = 0;
  let linksFailed = 0;

  for (const link of graphLinks) {
    const linkId = link.documentId ?? link.id;
    const attr = link.attributes ?? link;
    const srcPaper = attr.source?.data ?? attr.source;
    const tgtPaper = attr.target?.data ?? attr.target;

    if (!srcPaper || !tgtPaper) {
      linksFailed++;
      continue;
    }

    const srcPaperId = srcPaper.documentId ?? srcPaper.id;
    const tgtPaperId = tgtPaper.documentId ?? tgtPaper.id;

    const srcPubId = paperToPub[String(srcPaperId)];
    const tgtPubId = paperToPub[String(tgtPaperId)];

    if (!srcPubId || !tgtPubId) {
      console.log(`  ⚠ Link ${linkId}: cannot resolve paper IDs → publication IDs`);
      linksFailed++;
      continue;
    }

    try {
      await updateEntry("graph-links", linkId, {
        source: srcPubId,
        target: tgtPubId,
      });
      linksMigrated++;
    } catch (err) {
      console.error(`  ✗ Failed to migrate link ${linkId}: ${err.message}`);
      linksFailed++;
    }
  }

  console.log(`\nGraph links: ${linksMigrated} migrated, ${linksFailed} failed.`);
  console.log("\nMigration complete. You can now safely remove the Paper content type if desired.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
