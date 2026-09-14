import { Suspense } from "react";
import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import ClassicClient from "./ClassicClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const search = await getSingleType("search-page", locale);

  return {
    title: search?.classicTitle || "Classic Search",
    description: "Search across AIRi's research, people, projects, and publications.",
  };
}

export default async function Page() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const searchData = await getSingleType("search-page", locale);

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading search...</div>}>
            <ClassicClient searchData={searchData} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
