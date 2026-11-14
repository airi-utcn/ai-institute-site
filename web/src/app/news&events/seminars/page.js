import { canonical } from "@/lib/metadata";
import { cookies } from "next/headers";
import SeminarsClient from "./seminarsClient";
import { getEvents, transformEventData, getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const seminarsPage = await getSingleType("seminars-page", locale);

  return {
    title: seminarsPage?.seminarsTitle || "Seminars",
    description: seminarsPage?.seminarsSubtitle || "Research seminars and talks hosted by AIRi at the Technical University of Cluj-Napoca.",
    alternates: canonical('/news&events/seminars'),
  };
}

export default async function SeminarsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [seminarsData, pageData] = await Promise.all([
    getEvents({ locale, scientificOnly: true }),
    getSingleType("seminars-page", locale),
  ]);

  const events = transformEventData(eventsData);
  return <SeminarsClient events={events} pageData={pageData} />;
}
