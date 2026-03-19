export const metadata = {
  title: "Events",
  description: "Upcoming and past events organized by the Artificial Intelligence Research Institute at UTCN.",
};

import EventsClient from "./eventsClient";
import { getEvents, transformEventData } from "@/lib/strapi";

export default async function EventsPage() {
  const eventsData = await getEvents();
  const events = transformEventData(eventsData);
  return <EventsClient events={events} />;
}
