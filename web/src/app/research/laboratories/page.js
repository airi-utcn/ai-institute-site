import { canonical } from "@/lib/metadata";
import { cookies } from "next/headers";
import { getLaboratories, getSingleType, transformLaboratoryData } from "@/lib/strapi";
import LaboratoriesClient from "./LaboratoriesClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  try {
    const pageData = await getSingleType("laboratories-page", locale);
    return {
      title: pageData?.title || "Laboratories & Spaces",
      description: pageData?.subtitle || "State-of-the-art research laboratories and sponsored spaces at the Artificial Intelligence Research Institute.",
      alternates: canonical('/research/laboratories'),
    };
  } catch {
    return {
      title: "Laboratories & Spaces",
      description: "State-of-the-art research laboratories and sponsored spaces at AIRI.",
      alternates: canonical('/research/laboratories'),
    };
  }
}

export default async function LaboratoriesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [strapiLabs, pageData] = await Promise.all([
    getLaboratories({ locale }),
    getSingleType("laboratories-page", locale),
  ]);

  const laboratories = transformLaboratoryData(strapiLabs);

  return (
    <LaboratoriesClient laboratories={laboratories} pageData={pageData} />
  );
}
