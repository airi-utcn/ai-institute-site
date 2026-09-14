import { cookies } from "next/headers";
import AwardsClient from "./awardsClient";
import { getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const newsPage = await getSingleType("news-page", locale);

  return {
    title: newsPage?.tabAwards || "Awards",
    description: "Awards and recognitions received by AIRi researchers and teams at UTCN.",
  };
}

export default async function AwardsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType("news-page", locale);

  return <AwardsClient pageData={pageData} />;
}
