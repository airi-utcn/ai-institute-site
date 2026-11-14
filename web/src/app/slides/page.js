import { canonical } from "@/lib/metadata";
import { cookies } from "next/headers";
import { getSingleType, getSlides, transformSlideData } from "@/lib/strapi";
import SlidesClient from "./SlidesClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const pageData = await getSingleType("slides-page", locale);

  return {
    title: pageData?.title || "Slides",
    description: pageData?.subtitle || "Presentations and slide materials from AIRi at UTCN.",
    alternates: canonical("/slides"),
  };
}

export default async function SlidesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const [slidesData, pageData] = await Promise.all([
    getSlides({ locale }),
    getSingleType("slides-page", locale),
  ]);

  return (
    <SlidesClient
      slides={transformSlideData(slidesData)}
      pageData={pageData}
    />
  );
}
