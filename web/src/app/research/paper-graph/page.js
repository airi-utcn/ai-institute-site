import { canonical } from "@/lib/metadata";
export const metadata = {
  title: "ICIA – Research Graph",
  alternates: canonical('/research/paper-graph'),
};

import {
  getGraphMacros,
  getGraphPublications,
  getGraphLinks,
  transformGraphMacroData,
  transformGraphPublicationData,
  transformGraphLinkData,
} from "@/lib/strapi";
import GalaxyClient from "./GalaxyClient";

const MACRO_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7",
  "#dda0dd", "#98d8c8", "#f7dc6f", "#bb8fce", "#85c1e9",
  "#f8c471", "#82e0aa", "#f1948a", "#aed6f1", "#d5a6bd",
  "#a3e4d7", "#f9e79f", "#d2b4de", "#abebc6", "#fadbd8",
];

const sortMacros = (a, b) => {
  const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : Number.POSITIVE_INFINITY;
  const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : Number.POSITIVE_INFINITY;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" });
};

export default async function PaperGraphPage() {
  const [macrosRaw, publicationsRaw, linksRaw] = await Promise.all([
    getGraphMacros(),
    getGraphPublications(),
    getGraphLinks(),
  ]);
  const macros = transformGraphMacroData(macrosRaw).filter((macro) => macro.isActive !== false);
  const publications = transformGraphPublicationData(publicationsRaw);

  const macroMap = {};
  macros.forEach((macro) => {
    if (!macro.slug) return;
    macroMap[macro.slug] = {
      ...macro,
      id: macro.slug,
      label: macro.name,
      paperCount: 0,
      topicCounts: {},
    };
  });

  publications.forEach((p) => {
    const macroSlug = p.graphMacroPrimary?.slug;
    if (!macroSlug || !macroMap[macroSlug]) return;
    const entry = macroMap[macroSlug];
    entry.paperCount += 1;
    (p.topics || []).forEach((t) => {
      entry.topicCounts[t] = (entry.topicCounts[t] || 0) + 1;
    });
  });

  const macroList = Object.values(macroMap)
    .sort(sortMacros)
    .map((macro, idx) => ({
      ...macro,
      color: MACRO_COLORS[idx % MACRO_COLORS.length],
      topTopics: Object.entries(macro.topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t),
    }));

  // Build publication lookups
  const oaToIdMap = {};
  const publicationById = {};
  publications.forEach((p) => {
    if (p.openAlexId) oaToIdMap[p.openAlexId] = p.id;
    publicationById[p.id] = p;
  });

  const links = transformGraphLinkData(linksRaw, oaToIdMap);

  const publicationMacro = {};
  publications.forEach((p) => {
    const macroSlug = p.graphMacroPrimary?.slug;
    if (macroSlug) publicationMacro[p.id] = macroSlug;
  });

  // Build inter-macro link summary (macro-to-macro counts)
  const bridgeMap = {};
  links.forEach((l) => {
    const sc = publicationMacro[l.sourceId];
    const tc = publicationMacro[l.targetId];
    if (!sc || !tc || sc === tc) return;
    const key = sc < tc ? `${sc}-${tc}` : `${tc}-${sc}`;
    if (!bridgeMap[key]) bridgeMap[key] = { source: sc < tc ? sc : tc, target: sc < tc ? tc : sc, count: 0 };
    bridgeMap[key].count += 1;
  });
  const interLinks = Object.values(bridgeMap);
  
  // Debug log for cross-macro links
  console.log(`[paper-graph] ${links.length} total links, ${interLinks.length} macro bridges`);
  if (interLinks.length > 0) {
    console.log(`[paper-graph] Bridge sample:`, interLinks.slice(0, 3).map(l => `${l.source}↔${l.target}:${l.count}`).join(', '));
  }

  // Build publication-level cross-macro links for hover preview
  // Group by macro pair, limit to top links per pair
  const crossClusterLinks = links
    .filter((l) => {
      const sc = publicationMacro[l.sourceId];
      const tc = publicationMacro[l.targetId];
      return sc && tc && sc !== tc;
    })
    .map((l) => {
      const sourcePublication = publicationById[l.sourceId];
      const targetPublication = publicationById[l.targetId];
      return {
        sourceId: l.sourceId,
        targetId: l.targetId,
        sourceTitle: sourcePublication?.title || 'Unknown',
        targetTitle: targetPublication?.title || 'Unknown',
        sourceCluster: publicationMacro[l.sourceId],
        targetCluster: publicationMacro[l.targetId],
        score: l.score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 200); // Limit for performance

  if (macroList.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#03070f" }}>
        <div className="font-mono text-amber-500/40 text-sm">
          Graph not initialized yet. Please check back later. Greatness awaits...
        </div>
      </main>
    );
  }

  return (
    <GalaxyClient
      macros={macroList}
      interLinks={interLinks}
      crossClusterLinks={crossClusterLinks}
      totalPapers={publications.length}
    />
  );
}


