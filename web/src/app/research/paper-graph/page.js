export const metadata = {
  title: "ICIA – Research Graph",
};

import { getPapers, getGraphLinks, transformPaperData, transformGraphLinkData } from "@/lib/strapi";
import GalaxyClient from "./GalaxyClient";

const COMMUNITY_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7",
  "#dda0dd", "#98d8c8", "#f7dc6f", "#bb8fce", "#85c1e9",
  "#f8c471", "#82e0aa", "#f1948a", "#aed6f1", "#d5a6bd",
  "#a3e4d7", "#f9e79f", "#d2b4de", "#abebc6", "#fadbd8",
];

export default async function PaperGraphPage() {
  const papersRaw = await getPapers();
  const papers = transformPaperData(papersRaw);

  // Build community index
  const communityMap = {};
  papers.forEach((p) => {
    if (p.community == null) return;
    if (!communityMap[p.community]) {
      communityMap[p.community] = {
        id: p.community,
        label: p.communityLabel || `Cluster ${p.community}`,
        paperCount: 0,
        topicCounts: {},
      };
    }
    communityMap[p.community].paperCount += 1;
    (p.topics || []).forEach((t) => {
      communityMap[p.community].topicCounts[t] =
        (communityMap[p.community].topicCounts[t] || 0) + 1;
    });
  });

  const communities = Object.values(communityMap)
    .sort((a, b) => b.paperCount - a.paperCount)
    .map((comm, ci) => ({
      ...comm,
      color: COMMUNITY_COLORS[ci % COMMUNITY_COLORS.length],
      topTopics: Object.entries(comm.topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t),
    }));

  // Build inter-community link summary
  const oaToIdMap = {};
  papers.forEach((p) => { if (p.openAlexId) oaToIdMap[p.openAlexId] = p.id; });
  const linksRaw = await getGraphLinks();
  const links = transformGraphLinkData(linksRaw, oaToIdMap);
  const paperComm = {};
  papers.forEach((p) => { if (p.community != null) paperComm[p.id] = p.community; });
  const bridgeMap = {};
  links.forEach((l) => {
    const sc = paperComm[l.sourceId];
    const tc = paperComm[l.targetId];
    if (sc == null || tc == null || sc === tc) return;
    const key = sc < tc ? `${sc}-${tc}` : `${tc}-${sc}`;
    if (!bridgeMap[key]) bridgeMap[key] = { source: Math.min(sc, tc), target: Math.max(sc, tc), count: 0 };
    bridgeMap[key].count += 1;
  });
  const interLinks = Object.values(bridgeMap);

  if (communities.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#03070f" }}>
        <div className="font-mono text-amber-500/40 text-sm">
          No community data yet. Run the paper-sync script to generate clusters.
        </div>
      </main>
    );
  }

  return <GalaxyClient communities={communities} interLinks={interLinks} totalPapers={papers.length} />;
}


