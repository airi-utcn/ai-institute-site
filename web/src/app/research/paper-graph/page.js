export const metadata = {
  title: "ICIA – Paper Graph",
};

import { getPapers, getGraphLinks, transformPaperData, transformGraphLinkData } from "@/lib/strapi";
import PaperGraphClient from "./PaperGraphClient";

export default async function PaperGraphPage() {
  const [papersRaw, linksRaw] = await Promise.all([
    getPapers(),
    getGraphLinks()
  ]);

  const papers = transformPaperData(papersRaw);

  // Build map for link resolution
  const oaToId = {};
  papers.forEach(p => {
    if (p.openAlexId) oaToId[p.openAlexId] = p.id;
  });

  const links = transformGraphLinkData(linksRaw, oaToId);

  // Build community data from papers
  const communityMap = {};  // communityId → { label, papers: [...], id }
  papers.forEach(p => {
    if (p.community == null) return;
    if (!communityMap[p.community]) {
      communityMap[p.community] = {
        id: p.community,
        label: p.communityLabel || `Cluster ${p.community}`,
        paperIds: [],
      };
    }
    communityMap[p.community].paperIds.push(p.id);
  });
  const communities = Object.values(communityMap);

  return (
    <main className="overflow-hidden">
      <PaperGraphClient papers={papers} links={links} communities={communities} />
    </main>
  );
}
