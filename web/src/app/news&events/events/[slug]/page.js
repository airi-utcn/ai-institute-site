import { getEventBySlug, transformEventData, getEvents, getSingleType } from "@/lib/strapi";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import EventSlugClient from "./EventSlugClient";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const data = await getEventBySlug(resolvedParams.slug, locale);
  if (!data) return {};

  const transformed = transformEventData([data])[0];

  return {
    title: transformed ? `${transformed.title} | Events` : "Event",
    description: transformed?.description || "AIRi Event",
  };
}

export async function generateStaticParams() {
  try {
    const events = await getEvents({ locale: "en" });
    if (!events || !events.length) return [];
    
    return events
      .filter((event) => event.slug)
      .map((event) => ({
        slug: event.slug,
      }));
  } catch {
    return [];
  }
}

export default async function EventSlugPage({ params }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  const [data, pageData] = await Promise.all([
    getEventBySlug(resolvedParams.slug, locale),
    getSingleType("events-page", locale),
  ]);

  if (!data) notFound();

  const event = transformEventData([data])[0];

  return (
    <>
      <FallbackDisclaimer isFallback={event._isFallback} />
      <EventSlugClient event={event} pageData={pageData} />
    </>
  );
}
