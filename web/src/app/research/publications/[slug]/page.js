import { notFound } from "next/navigation";
import { getPublications, getPublicationBySlug, transformPublicationData } from "@/lib/strapi";
import PublicationDetailClient from "./PublicationDetailClient";
import { JsonLd, publicationJsonLd } from "@/lib/jsonld";

export async function generateStaticParams() {
  try {
    const pubsRaw = await getPublications();
    const pubs = transformPublicationData(pubsRaw);
    return pubs
      .filter((p) => p.slug)
      .map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!slug) return { title: "Publication Not Found" };

  try {
    const pubEntry = await getPublicationBySlug(slug);
    if (!pubEntry) return { title: "Publication Not Found" };
    const [publication] = transformPublicationData([pubEntry]);
    if (!publication) return { title: "Publication Not Found" };

    const authors = Array.isArray(publication.authors)
      ? publication.authors.map((a) => a?.name || a).filter(Boolean).join(", ")
      : "";
    const description = authors
      ? `${publication.title} by ${authors}`.slice(0, 160)
      : (publication.description || publication.title || "").slice(0, 160);

    return {
      title: publication.title || "Publication",
      description,
      openGraph: {
        title: `${publication.title} | AIRi @ UTCN`,
        description,
        type: "article",
      },
    };
  } catch {
    return { title: "Publication" };
  }
}

export default async function PublicationDetailPage({ params }) {
  const { slug } = await params;
  if (!slug) notFound();

  const pubEntry = await getPublicationBySlug(slug);
  if (!pubEntry) notFound();

  const [publication] = transformPublicationData([pubEntry]);
  if (!publication) notFound();

  return (
    <>
      <JsonLd data={publicationJsonLd(publication)} />
      <PublicationDetailClient publication={publication} />
    </>
  );
}
