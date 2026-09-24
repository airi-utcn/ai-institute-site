import { cookies } from "next/headers";
import CareerClient from "./careerClient";
import { getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const careersPage = await getSingleType("careers-page", locale);

  return {
    title: careersPage?.careersTitle || "Careers & Job Opportunities",
    description: careersPage?.careersSubtitle || "Open positions and career opportunities at the Artificial Intelligence Research Institute.",
  };
}

export default async function CareerPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType("careers-page", locale);

  return <CareerClient pageData={pageData} />;
}
