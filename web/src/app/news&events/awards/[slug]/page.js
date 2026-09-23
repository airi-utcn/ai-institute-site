import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies } from "next/headers";
import { notFound } from 'next/navigation';
import { getNewsArticleBySlug, getNewsArticles, transformNewsData, getSingleType } from '@/lib/strapi';
import AwardArticleClient from './AwardArticleClient';

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
  const pageData = await getSingleType("awards-page", locale);
  const article = transformNewsData(articleRow ? [articleRow] : [])[0];

  if (!article) {
    return { title: pageData?.awardsTitle || 'Awards Article' };
  }

  return {
    title: `${article.title} | Awards`,
    description: article.summary || 'Read the latest news from AIRI.',
  };
}

export default async function NewsArticlePage({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const [articleRow, pageData] = await Promise.all([
    getNewsArticleBySlug(slug, locale),
    getSingleType("awards-page", locale),
  ]);

  if (!articleRow) {
    notFound();
  }

  const article = transformNewsData([articleRow])[0];

  if (!article) {
    notFound();
  }

  return <AwardArticleClient article={article} pageData={pageData} />;
}
