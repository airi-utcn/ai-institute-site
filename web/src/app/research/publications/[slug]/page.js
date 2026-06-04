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
  const canonicalUrl = `/research/publications/${encodeURIComponent(slug)}`;

  try {
    const pubEntry = await getPublicationBySlug(slug);
    if (!pubEntry) return { title: "Publication Not Found" };
    const [publication] = transformPublicationData([pubEntry]);
    if (!publication) return { title: "Publication Not Found" };

    const authors = Array.isArray(publication.authors)
      ? publication.authors.map((a) => a?.name || a).filter(Boolean).join(", ")
      : "";
    const contentDescription = publication.description || publication.abstract || "";
    const authorsDescription = authors ? `${publication.title} by ${authors}` : "";
    const description = authors
      ? (contentDescription || authorsDescription).slice(0, 160)
      : (contentDescription || publication.title || "").slice(0, 160);

    return {
      title: publication.title || "Publication",
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${publication.title} | AIRi @ UTCN`,
        description,
        type: "article",
        url: canonicalUrl,
        siteName: "AIRi @ UTCN",
        images: [
          {
            url: "/homepage/hero5.png",
            width: 1200,
            height: 630,
            alt: `${publication.title} | AIRi @ UTCN`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${publication.title} | AIRi @ UTCN`,
        description,
        images: ["/homepage/hero5.png"],
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
