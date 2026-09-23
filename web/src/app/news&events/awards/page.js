import { cookies } from "next/headers";
import AwardsClient from "./awardsClient";
import { getSingleType, getNewsArticles, transformNewsData } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const newsPage = await getSingleType("awards-page", locale);

  return {
    title: newsPage?.tabAwards || "Awards",
    description: "Awards and recognitions received by AIRi researchers and teams at UTCN.",
  };
}

export default async function AwardsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [awards, pageData] = await Promise.all([
    getNewsArticles({ locale, filters: { category: { $eq: "award" } } }),
    getSingleType("awards-page", locale),
  ]);

  const awardsItems = transformNewsData(awards);
  
  return <AwardsClient awardsItems={awardsItems} pageData={pageData} />;
}
