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
import IntersectionGraphClient from "../../../IntersectionGraphClient";

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
  const { communitySlug, otherMacroSlug } = await params;
  return { title: `ICIA – ${communitySlug} × ${otherMacroSlug}`, alternates: canonical(`/research/paper-graph/${encodeURIComponent(communitySlug)}/x/${encodeURIComponent(otherMacroSlug)}`) };
}

export default async function MacroIntersectionPage({ params }) {
  const { communitySlug: leftSlug, otherMacroSlug: rightSlug } = await params;
  if (!leftSlug || !rightSlug || leftSlug === rightSlug) notFound();

  const [macrosRaw, leftRaw, rightRaw, linksRaw] = await Promise.all([
    getGraphMacros(),
    getGraphPublicationsByMacroSlug(leftSlug),
    getGraphPublicationsByMacroSlug(rightSlug),
    getGraphLinks(),
  ]);

  const macros = transformGraphMacroData(macrosRaw)
    .filter((macro) => macro.isActive !== false)
    .sort(sortMacros);
  const leftIndex = macros.findIndex((macro) => macro.slug === leftSlug);
  const rightIndex = macros.findIndex((macro) => macro.slug === rightSlug);
  if (leftIndex < 0 || rightIndex < 0) notFound();

  const leftMacro = {
    ...macros[leftIndex],
    color: MACRO_COLORS[leftIndex % MACRO_COLORS.length],
  };
  const rightMacro = {
    ...macros[rightIndex],
    color: MACRO_COLORS[rightIndex % MACRO_COLORS.length],
  };

  const leftPublications = transformGraphPublicationData(leftRaw);
  const rightPublications = transformGraphPublicationData(rightRaw);
  const publications = [...leftPublications, ...rightPublications];

  if (publications.length === 0) notFound();

  const oaToId = {};
  const publicationById = {};
  publications.forEach((p) => {
    if (p.openAlexId) oaToId[p.openAlexId] = p.id;
    publicationById[p.id] = p;
  });

  const rawLinks = transformGraphLinkData(linksRaw, oaToId);
  const macroById = {};
  publications.forEach((p) => {
    const slug = p.graphMacroPrimary?.slug;
    if (slug) macroById[p.id] = slug;
  });

  const crossLinks = rawLinks.filter((l) => {
    const sc = macroById[l.sourceId];
    const tc = macroById[l.targetId];
    return sc && tc && sc !== tc;
  });

  if (crossLinks.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#03070f" }}>
        <div className="font-mono text-amber-500/40 text-sm">
          No cross-macro links yet between {leftMacro.name} and {rightMacro.name}.
        </div>
      </main>
    );
  }

  const crossPaperIds = new Set();
  crossLinks.forEach((l) => {
    crossPaperIds.add(l.sourceId);
    crossPaperIds.add(l.targetId);
  });

  const filteredPublications = publications.filter((p) => crossPaperIds.has(p.id));
  const filteredLinks = crossLinks.filter(
    (l) => crossPaperIds.has(l.sourceId) && crossPaperIds.has(l.targetId)
  );

  return (
    <main className="overflow-hidden" style={{ background: "#03070f" }}>
      <IntersectionGraphClient
        publications={filteredPublications}
        links={filteredLinks}
        leftMacro={leftMacro}
        rightMacro={rightMacro}
      />
    </main>
  );
}
