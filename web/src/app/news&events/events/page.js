import { cookies } from "next/headers";
import EventsClient from "./eventsClient";
import { getEvents, transformEventData, getSingleType } from "@/lib/strapi";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const newsPage = await getSingleType("news-page", locale);

  return {
    title: newsPage?.tabEvents || "Events",
    description: "Upcoming and past events organized by the Artificial Intelligence Research Institute at UTCN.",
  };
}

export default async function EventsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [eventsData, pageData] = await Promise.all([
    getEvents({ locale }),
    getSingleType("news-page", locale),
  ]);

  const events = transformEventData(eventsData);
  return <EventsClient events={events} pageData={pageData} />;
}
