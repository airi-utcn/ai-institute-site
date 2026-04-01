import { notFound } from "next/navigation";
import { getResults, getResultBySlug, transformResultData } from "@/lib/strapi";
import ResultDetailClient from "./ResultDetailClient";
import { JsonLd } from "@/lib/jsonld";

export async function generateStaticParams() {
  try {
    const resultsRaw = await getResults();
    const results = transformResultData(resultsRaw);
    return results
      .filter((r) => r.slug)
      .map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!slug) return { title: "Result Not Found" };

  try {
    const resultEntry = await getResultBySlug(slug);
    if (!resultEntry) return { title: "Result Not Found" };
    const [result] = transformResultData([resultEntry]);
    if (!result) return { title: "Result Not Found" };

    const description = (result.description || result.title || "").slice(0, 160);

    return {
      title: result.title || "Result",
      description,
      openGraph: {
        title: `${result.title} | AIRi @ UTCN`,
        description,
        type: "article",
      },
    };
  } catch {
    return { title: "Result" };
  }
}

export default async function ResultDetailPage({ params }) {
  const { slug } = await params;
  if (!slug) notFound();

  const resultEntry = await getResultBySlug(slug);
  if (!resultEntry) notFound();

  const [result] = transformResultData([resultEntry]);
  if (!result) notFound();

  // Basic JSON-LD for result (similar to publication)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: result.title,
    description: result.description,
    datePublished: result.publishedDate,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <ResultDetailClient result={result} />
    </>
  );
}
