import { cookies } from "next/headers";
import OpenProjectsCallsClient from "./openProjectsCallsClient";
import { getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const newsPage = await getSingleType("news-page", locale);

  return {
    title: newsPage?.tabCalls || "Open Project Calls",
    description: "Open calls for research projects and funding opportunities at AIRi.",
  };
}

export default async function OpenProjectsCallsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType("news-page", locale);

  return <OpenProjectsCallsClient pageData={pageData} />;
}
