import { notFound } from "next/navigation";
import { getPapersByCommunity, transformPaperData } from "@/lib/strapi";
import { slugify } from "@/lib/slug";
import ConstellationClient from "../ConstellationClient";

const COMMUNITY_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7",
  "#dda0dd", "#98d8c8", "#f7dc6f", "#bb8fce", "#85c1e9",
  "#f8c471", "#82e0aa", "#f1948a", "#aed6f1", "#d5a6bd",
  "#a3e4d7", "#f9e79f", "#d2b4de", "#abebc6", "#fadbd8",
];

export async function generateMetadata({ params }) {
  const { communitySlug } = await params;
  return { title: `ICIA – Community ${communitySlug}` };
}

export default async function CommunityTopicsPage({ params }) {
  const { communitySlug } = await params;

  const match = communitySlug.match(/^c-(\d+)$/);
  if (!match) notFound();
  const communityId = parseInt(match[1], 10);

  const papersRaw = await getPapersByCommunity(communityId);
  const papers = transformPaperData(papersRaw);

  if (papers.length === 0) notFound();

  const communityLabel =
    papers.find((p) => p.communityLabel)?.communityLabel ||
    `Community ${communityId}`;

  const commColor = COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length];

  // Group papers by first topic
  const topicMap = {};
  papers.forEach((p) => {
    const topic = p.topics?.[0] || "Other";
    if (!topicMap[topic]) topicMap[topic] = { label: topic, paperCount: 0, years: [] };
    topicMap[topic].paperCount += 1;
    if (p.year) topicMap[topic].years.push(p.year);
  });

  const topics = Object.values(topicMap)
    .sort((a, b) => b.paperCount - a.paperCount)
    .map((t) => {
      const yearMin = t.years.length ? Math.min(...t.years) : null;
      const yearMax = t.years.length ? Math.max(...t.years) : null;
      return {
        label: t.label,
        slug: slugify(t.label),
        paperCount: t.paperCount,
        yearRange: yearMin ? (yearMin === yearMax ? `${yearMin}` : `${yearMin}–${yearMax}`) : null,
      };
    });

  return (
    <ConstellationClient
      topics={topics}
      communityLabel={communityLabel}
      communitySlug={communitySlug}
      color={commColor}
      totalPapers={papers.length}
    />
  );
}
