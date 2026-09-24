import { cookies } from "next/headers";
import OpenProjectsCallsClient from "./openProjectsCallsClient";
import { getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const openCallsPage = await getSingleType("open-calls-page", locale);

  return {
    title: openCallsPage?.openCallsTitle || "Open Project Calls",
    description: openCallsPage?.openCallsSubtitle || "Open calls for research projects and funding opportunities at AIRi.",
  };
}

export default async function OpenProjectsCallsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType("open-calls-page", locale);

  return <OpenProjectsCallsClient pageData={pageData} />;
}
