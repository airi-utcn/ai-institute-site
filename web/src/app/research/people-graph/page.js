export const metadata = {
  title: "AIRI – People Graph",
  description:
    "Interactive graph of AIRI people connected through shared publications, projects and teams.",
};

import { getPeopleGraphData, getTeamsGraphData } from "@/lib/strapi";
import { attachScholarCitationCounts } from "@/lib/googleScholar";
import { buildGraph } from "./graphModel";
import PeopleGraphClient from "./PeopleGraphClient";

// Flatten raw Strapi team records to { id, name, memberIds }. Handles both the
// v5 flat shape and the v4 `data`/`attributes` wrapper.
function normalizeTeams(rawTeams) {
  return (rawTeams || []).map((t) => {
    const attr = t?.attributes ?? t ?? {};
    const memberIds = (attr.members || [])
      .map((m) => {
        const person = m?.person?.data ?? m?.person;
        return person?.id ?? null;
      })
      .filter((id) => id != null);
    return { id: t?.id ?? null, name: attr.name || null, memberIds };
  });
}

export default async function PeopleGraphPage() {
  const [people, rawTeams] = await Promise.all([
    getPeopleGraphData(),
    getTeamsGraphData(),
  ]);
  // Citation glow is driven by each person's Google Scholar lifetime total
  // (scraped + cached server-side), not by summed cited_by of CMS-linked papers.
  const enriched = await attachScholarCitationCounts(people);
  const { nodes, links, departmentColors } = buildGraph(enriched, normalizeTeams(rawTeams));

  if (!nodes.length) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0b0f17" }}
      >
        <div className="font-mono text-sm text-white/40">
          No people found yet. Make sure Strapi is running and populated.
        </div>
      </main>
    );
  }

  return (
    <PeopleGraphClient
      nodes={nodes}
      links={links}
      departmentColors={departmentColors}
    />
  );
}
