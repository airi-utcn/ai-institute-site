import { cookies } from "next/headers";
import EventsClient from "./eventsClient";
import { getEvents, transformEventData, getSingleType } from "@/lib/strapi";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const eventsPage = await getSingleType("events-page", locale);

  return {
    title: eventsPage?.eventsTitle || "Events",
    description: eventsPage?.eventsSubtitle || "Upcoming and past events organized by the Artificial Intelligence Research Institute at UTCN.",
  };
}

export default async function EventsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [eventsData, pageData] = await Promise.all([
    getEvents({ locale }),
    getSingleType("events-page", locale),
  ]);

  const events = transformEventData(eventsData);
  return (
    <>
      <FallbackDisclaimer isFallback={pageData?._isFallback} />
      <EventsClient events={events} pageData={pageData} />
    </>
  );
}
