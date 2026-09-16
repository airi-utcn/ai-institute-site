import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import KnowledgeGraphClient from "./KnowledgeGraphClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const search = await getSingleType("search-page", locale);

  return {
    title: search?.kgTitle || "Knowledge Graphs",
    description: "Explore AIRi's research landscape through interactive knowledge graphs.",
  };
}

export default async function KGPSoon() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const searchData = await getSingleType("search-page", locale);

  return (
    <>
      <FallbackDisclaimer isFallback={searchData?._isFallback} />
      <div className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <KnowledgeGraphClient searchData={searchData} />
        </section>
      </div>
    </div>
    </>
  );
}
