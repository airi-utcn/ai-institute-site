import { cookies } from "next/headers";
import ResourcesClient from "./resourcesClient";
import { getResources, transformResourceData, getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const resPage = await getSingleType("resources-page", locale);

  return {
    title: resPage?.title || "Resources",
    description: resPage?.subtitle || "Explore tools, resources, APIs, and learning materials curated by the Artificial Intelligence Research Institute.",
  };
}

export default async function ResourcesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [strapiResources, pageData] = await Promise.all([
    getResources({ locale }),
    getSingleType("resources-page", locale),
  ]);

  const resources = transformResourceData(strapiResources);

  return <ResourcesClient resources={resources} pageData={pageData} />;
}
