export const metadata = {
  title: "AIRI – People Graph",
  description:
    "Interactive graph of AIRI people connected through shared publications and projects.",
};

import { getPeopleGraphData } from "@/lib/strapi";
import { attachScholarCitationCounts } from "@/lib/googleScholar";
import { buildGraph } from "./graphModel";
import PeopleGraphClient from "./PeopleGraphClient";

export default async function PeopleGraphPage() {
  const people = await getPeopleGraphData();
  // Citation glow is driven by each person's Google Scholar lifetime total
  // (scraped + cached server-side), not by summed cited_by of CMS-linked papers.
  const enriched = await attachScholarCitationCounts(people);
  const { nodes, links, departmentColors } = buildGraph(enriched);

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
