import { cookies } from "next/headers";
import CareerClient from "./careerClient";
import { getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const newsPage = await getSingleType("news-page", locale);

  return {
    title: newsPage?.tabCareers || "Careers & Job Opportunities",
    description: "Open positions and career opportunities at the Artificial Intelligence Research Institute.",
  };
}

export default async function CareerPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType("news-page", locale);

  return <CareerClient pageData={pageData} />;
}
