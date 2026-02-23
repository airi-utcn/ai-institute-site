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

  return (
    <main className="overflow-hidden">
      <PaperGraphClient papers={papers} links={links} />
    </main>
  );
}
