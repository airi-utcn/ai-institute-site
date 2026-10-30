import { canonical } from "@/lib/metadata";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import {
  getLaboratories,
  getLaboratoryBySlug,
  transformLaboratoryData,
  getSingleType,
} from "@/lib/strapi";
import LaboratoryDetailClient from "./LaboratoryDetailClient";
import { JsonLd, laboratoryJsonLd } from "@/lib/jsonld";

export async function generateStaticParams() {
  try {
    const labs = await getLaboratories();
    return (labs || [])
      .filter((l) => l?.slug)
      .map((l) => ({ slug: l.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  try {
    const labData = await getLaboratoryBySlug(slug, locale);
    if (!labData) return { title: "Laboratory Details" };
    const lab = transformLaboratoryData([labData])[0];
    return {
      title: lab?.title || "Laboratory Details",
      description: lab?.summary?.slice(0, 160) || "Laboratory details and facilities at AIRI.",
      alternates: canonical(`/research/laboratories/${encodeURIComponent(slug)}`),
    };
  } catch {
    return { title: "Laboratory Details", alternates: canonical(`/research/laboratories/${encodeURIComponent(slug)}`) };
  }
}

export default async function LaboratoryPage({ params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [labData, pageData] = await Promise.all([
    getLaboratoryBySlug(slug, locale),
    getSingleType("laboratories-page", locale),
  ]);

  if (!labData) {
    notFound();
  }

  const lab = transformLaboratoryData([labData])[0];

  return (
    <>
      <FallbackDisclaimer isFallback={lab._isFallback} />
      {typeof laboratoryJsonLd === "function" && (
        <JsonLd data={laboratoryJsonLd(lab)} />
      )}
      <LaboratoryDetailClient lab={lab} pageData={pageData} />
    </>
  );
}
