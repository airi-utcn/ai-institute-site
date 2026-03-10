export const metadata = {
  title: "News",
  description: "Latest news and announcements from AIRi at the Technical University of Cluj-Napoca.",
};

import NewsClient from "./NewsClient";
import { getNewsArticles, transformNewsData } from "@/lib/strapi";

export default async function NewsPage() {
  const news = await getNewsArticles();
  const newsItems = transformNewsData(news);
  return <NewsClient newsItems={newsItems} />;
}