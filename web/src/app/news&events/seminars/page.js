import { cookies } from "next/headers";
import SeminarsClient from "./seminarsClient";
import { getSeminars, transformSeminarData, getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const seminarsPage = await getSingleType("seminars-page", locale);

  return {
    title: seminarsPage?.seminarsTitle || "Seminars",
    description: seminarsPage?.seminarsSubtitle || "Research seminars and talks hosted by AIRi at the Technical University of Cluj-Napoca.",
  };
}

export default async function SeminarsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [seminarsData, pageData] = await Promise.all([
    getSeminars({ locale }),
    getSingleType("seminars-page", locale),
  ]);

  const seminars = transformSeminarData(seminarsData);
  return <SeminarsClient seminars={seminars} pageData={pageData} />;
}
