import { notFound } from 'next/navigation';
import { getNewsArticleBySlug, getNewsArticles, transformNewsData } from '@/lib/strapi';
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
  const articleRow = await getNewsArticleBySlug(slug);
  const article = transformNewsData(articleRow ? [articleRow] : [])[0];

  if (!article) {
    return { title: 'News Article' };
  }

  return {
    title: `${article.title} | News`,
    description: article.summary || 'Read the latest news from AIRI.',
  };
}

export default async function NewsArticlePage({ params }) {
  const { slug } = await params;
  const articleRow = await getNewsArticleBySlug(slug);

  if (!articleRow) {
    notFound();
  }

  const article = transformNewsData([articleRow])[0];

  if (!article) {
    notFound();
  }

  return <NewsArticleClient article={article} />;
}
