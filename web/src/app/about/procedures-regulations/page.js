import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import Client from "./Client";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);

  return {
    title: about?.proceduresTitle || "Procedures & Regulations",
    description: "Rules, guidelines, and operational procedures governing AIRi at UTCN.",
  };
}

export default async function RegulationsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);

  return <Client aboutData={about} />;
}
