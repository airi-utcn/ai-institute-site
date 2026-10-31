import { canonical } from "@/lib/metadata";
import { notFound } from "next/navigation";
import {
  getGraphMacros,
  getGraphPublicationsByMacroSlug,
  getGraphLinks,
  transformGraphMacroData,
  transformGraphPublicationData,
  transformGraphLinkData,
} from "@/lib/strapi";
import PaperGraphClient from "../../PaperGraphClient";
import { buildMesoTopics, filterPublicationsForMesoTopic } from "../../meso";

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

export async function generateMetadata({ params }) {
  const { communitySlug, topicSlug } = await params;
  return { title: `ICIA – ${topicSlug} · ${communitySlug}`, alternates: canonical(`/research/paper-graph/${encodeURIComponent(communitySlug)}/${encodeURIComponent(topicSlug)}`) };
}

export default async function TopicPublicationsPage({ params }) {
  const { communitySlug: macroSlug, topicSlug } = await params;

  const [macrosRaw, publicationsRaw, linksRaw] = await Promise.all([
    getGraphMacros(),
    getGraphPublicationsByMacroSlug(macroSlug),
    getGraphLinks(),
  ]);

  const macros = transformGraphMacroData(macrosRaw)
    .filter((macro) => macro.isActive !== false)
    .sort(sortMacros);
  const macroIndex = macros.findIndex((macro) => macro.slug === macroSlug);
  if (macroIndex < 0) notFound();
  const macro = macros[macroIndex];

  const allPublications = transformGraphPublicationData(publicationsRaw);
  if (allPublications.length === 0) notFound();

  const mesoTopics = buildMesoTopics(allPublications);
  const selectedTopic = mesoTopics.find((topic) => topic.slug === topicSlug);
  if (!selectedTopic) notFound();

  const publications = filterPublicationsForMesoTopic(allPublications, selectedTopic);
  if (publications.length === 0) notFound();

  // Build links scoped to visible publications only
  const oaToId = {};
  publications.forEach((p) => { if (p.openAlexId) oaToId[p.openAlexId] = p.id; });
  const links = transformGraphLinkData(linksRaw, oaToId);

  const topicLabel = selectedTopic.label;
  const macroLabel = macro?.name || macroSlug;
  const macroColor = MACRO_COLORS[macroIndex % MACRO_COLORS.length];

  return (
    <main className="overflow-hidden" style={{ background: "#03070f" }}>
      <PaperGraphClient
        publications={publications}
        links={links}
        backHref={`/research/paper-graph/${macroSlug}`}
        backLabel={macroLabel}
        topicLabel={topicLabel}
        accentColor={macroColor}
      />
    </main>
  );
}
