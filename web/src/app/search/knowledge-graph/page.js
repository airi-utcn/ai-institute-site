import { canonical } from "@/lib/metadata";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import KnowledgeGraphView from "@/components/knowledge-graph/KnowledgeGraphView";
import { parseGraphQuery } from "@/lib/knowledge-graph/query";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const search = await getSingleType("search-page", locale);

  return {
    title: search?.graphTitle || "Knowledge Graph",
    description:
      "Explore AIRi's research landscape through an interactive knowledge graph of people, publications, laboratories, projects, and topics.",
    alternates: canonical("/search/knowledge-graph"),
  };
}

function toSearchParams(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null) searchParams.append(key, entry);
      });
      return;
    }
    if (value !== undefined && value !== null) searchParams.set(key, value);
  });
  return searchParams;
}

export default async function KnowledgeGraphPage({ searchParams }) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const params = await searchParams;
  const options = parseGraphQuery(toSearchParams(params));

  const searchData = await getSingleType("search-page", locale);

  return (
    <>
      <FallbackDisclaimer isFallback={searchData?._isFallback} />
      <div className="page-container">
        <div className="content-wrapper content-padding">
          <KnowledgeGraphView
            initialQuery={options}
            title={searchData?.graphTitle || "Knowledge Graph"}
            subtitle="Explore AIRi people, publications, laboratories, projects, and topics. Everything is connected through authorship, membership, and research similarity."
          />
        </div>
      </div>
    </>
  );
}
