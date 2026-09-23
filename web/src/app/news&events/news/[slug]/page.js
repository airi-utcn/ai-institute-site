import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies } from "next/headers";
import { notFound } from 'next/navigation';
import { getNewsArticleBySlug, getNewsArticles, transformNewsData, getSingleType } from '@/lib/strapi';
import NewsArticleClient from './NewsArticleClient';

export async function generateStaticParams() {
  try {
    const newsItems = transformNewsData(await getNewsArticles());
    return newsItems
      .filter((item) => item.slug)
      .map((item) => ({ slug: item.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const articleRow = await getNewsArticleBySlug(slug, locale);
  const pageData = await getSingleType("news-page", locale);
  const article = transformNewsData(articleRow ? [articleRow] : [])[0];

  if (!article) {
    return { title: pageData?.newsTitle || 'News Article' };
  }

  return {
    title: `${article.title} | News`,
    description: article.summary || 'Read the latest news from AIRI.',
  };
}

export default async function NewsArticlePage({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const [articleRow, pageData] = await Promise.all([
    getNewsArticleBySlug(slug, locale),
    getSingleType("news-page", locale),
  ]);

  if (!articleRow) {
    notFound();
  }

  const article = transformNewsData([articleRow])[0];

  if (!article) {
    notFound();
  }

  return <NewsArticleClient article={article} pageData={pageData} />;
}
