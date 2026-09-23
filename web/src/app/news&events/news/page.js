import { cookies } from "next/headers";
import NewsClient from "./NewsClient";
import { getNewsArticles, transformNewsData, getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const newsPage = await getSingleType("news-page", locale);

  return {
    title: newsPage?.title || "News",
    description: newsPage?.subtitle || "Latest news and announcements from AIRi at the Technical University of Cluj-Napoca.",
  };
}

export default async function NewsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [news, pageData] = await Promise.all([
    getNewsArticles({ locale, filters: { category: { $ne: "award" } } }),
    getSingleType("news-page", locale),
  ]);

  const newsItems = transformNewsData(news);
  return <NewsClient newsItems={newsItems} pageData={pageData} />;
}
