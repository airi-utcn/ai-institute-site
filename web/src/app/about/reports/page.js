import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import Client from "./Client";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);

  return {
    title: about?.reportsTitle || "Reports",
    description: "Annual reports and research summaries from the Artificial Intelligence Research Institute at UTCN.",
  };
}

export default async function Page() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);

  return <Client aboutData={about} />;
}
