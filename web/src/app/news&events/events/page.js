export const metadata = {
  title: "ICIA - Events",
};

import EventsClient from "./eventsClient";
import { getEvents, transformEventData } from "@/lib/strapi";

export default async function EventsPage() {
  const eventsData = await getEvents();
  const events = transformEventData(eventsData);
  return <EventsClient events={events} />;
}
