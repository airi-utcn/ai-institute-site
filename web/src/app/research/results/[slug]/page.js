import { cookies } from "next/headers";
import { notFound } from 'next/navigation';
import { getResultBySlug, getResults, transformResultData } from '@/lib/strapi';
import ResultDetailsClient from './ResultDetailsClient';

export async function generateStaticParams() {
  try {
    const results = transformResultData(await getResults());
    return results
      .filter((result) => result.slug)
      .map((result) => ({ slug: result.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const resultRow = await getResultBySlug(slug, locale);
  const result = transformResultData(resultRow ? [resultRow] : [])[0];

  if (!result) {
    return { title: 'Result' };
  }

  const description = (result.description || result.title || '').slice(0, 160);

  return {
    title: `${result.title} | Research Result`,
    description,
    openGraph: {
      title: `${result.title} | AIRi @ UTCN`,
      description,
      type: 'article',
    },
  };
}

export default async function ResultPage({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const resultRow = await getResultBySlug(slug, locale);

  if (!resultRow) {
    notFound();
  }

  const result = transformResultData([resultRow])[0];

  if (!result) {
    notFound();
  }

  return <ResultDetailsClient result={result} />;
}
