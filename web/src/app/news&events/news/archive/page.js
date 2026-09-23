export const metadata = {
  title: "News Archive",
  description: "Browse older news and announcements from AIRi.",
};

import ArchiveClient from "./ArchiveClient";
import { getNewsArticles, transformNewsData, getSingleType } from "@/lib/strapi";

import { cookies } from "next/headers";

export default async function ArchivePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType("news-page", locale);
  const news = await getNewsArticles({ filters: { category: { $ne: "award" } } });
  const newsItems = transformNewsData(news);

  // As per the requirement, we want the older news here.
  // The first 15 (DISPLAY_LIMIT) are shown on the main page.
  // We can pass the whole array, or split it.
  const archiveItems = newsItems.slice(16);
  // To be perfectly aligned with main page, we used allGridItems.slice(0, 14) + 1 hero = 15. So we skip 15.

  return <ArchiveClient newsItems={archiveItems} pageData={pageData} />;
}
