import { notFound } from "next/navigation";
import { getPublicationBySlug, transformPublicationData } from "@/lib/strapi";
import PublicationDetailClient from "./PublicationDetailClient";

export default async function PublicationDetailPage({ params }) {
  const { slug } = await params;
  if (!slug) notFound();

  const pubEntry = await getPublicationBySlug(slug);
  if (!pubEntry) notFound();

  const [publication] = transformPublicationData([pubEntry]);
  if (!publication) notFound();

  return <PublicationDetailClient publication={publication} />;
}
