import { notFound } from "next/navigation";
import {
  getPapersByCommunity,
  getGraphLinks,
  transformPaperData,
  transformGraphLinkData,
} from "@/lib/strapi";
import { slugify } from "@/lib/slug";
import PaperGraphClient from "../../PaperGraphClient";

const COMMUNITY_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7",
  "#dda0dd", "#98d8c8", "#f7dc6f", "#bb8fce", "#85c1e9",
  "#f8c471", "#82e0aa", "#f1948a", "#aed6f1", "#d5a6bd",
  "#a3e4d7", "#f9e79f", "#d2b4de", "#abebc6", "#fadbd8",
];

export async function generateMetadata({ params }) {
  const { communitySlug, topicSlug } = await params;
  return { title: `ICIA – ${topicSlug} · ${communitySlug}` };
}

export default async function TopicPapersPage({ params }) {
  const { communitySlug, topicSlug } = await params;

  const match = communitySlug.match(/^c-(\d+)$/);
  if (!match) notFound();
  const communityId = parseInt(match[1], 10);

  const [papersRaw, linksRaw] = await Promise.all([
    getPapersByCommunity(communityId),
    getGraphLinks(),
  ]);

  const allPapers = transformPaperData(papersRaw);
  if (allPapers.length === 0) notFound();

  // Filter to the topic matching the slug
  const papers = allPapers.filter(
    (p) => slugify(p.topics?.[0] || "other") === topicSlug
  );
  if (papers.length === 0) notFound();

  // Build links scoped to visible papers only
  const oaToId = {};
  papers.forEach((p) => { if (p.openAlexId) oaToId[p.openAlexId] = p.id; });
  const links = transformGraphLinkData(linksRaw, oaToId);

  const communityLabel =
    allPapers.find((p) => p.communityLabel)?.communityLabel ||
    `Community ${communityId}`;

  const topicLabel = papers[0]?.topics?.[0] || topicSlug;
  const commColor = COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length];

  return (
    <main className="overflow-hidden" style={{ background: "#03070f" }}>
      <PaperGraphClient
        papers={papers}
        links={links}
        backHref={`/research/paper-graph/${communitySlug}`}
        backLabel={communityLabel}
        topicLabel={topicLabel}
        accentColor={commColor}
      />
    </main>
  );
}
