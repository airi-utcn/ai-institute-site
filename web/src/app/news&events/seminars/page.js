import { cookies } from "next/headers";
import SeminarsClient from "./seminarsClient";
import { getSeminars, transformSeminarData, getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const newsPage = await getSingleType("news-page", locale);

  return {
    title: newsPage?.tabSeminars || "Seminars",
    description: "Research seminars and talks hosted by AIRi at the Technical University of Cluj-Napoca.",
  };
}

export default async function SeminarsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [seminarsData, pageData] = await Promise.all([
    getSeminars({ locale }),
    getSingleType("news-page", locale),
  ]);

  const seminars = transformSeminarData(seminarsData);
  return <SeminarsClient seminars={seminars} pageData={pageData} />;
}
