import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import TimelineClient from "./TimelineClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const timeline = await getSingleType("timeline-page", locale, "events");

  return {
    title: timeline?.title?.replace(/[^\w\s-]/g, "").trim() || "Timeline",
    description: "Explore the history and milestones of the Artificial Intelligence Research Institute at UTCN.",
  };
}

export default async function TimelinePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const timeline = await getSingleType("timeline-page", locale, "events");

  return <TimelineClient timelineData={timeline} />;
}
