import { canonical } from "@/lib/metadata";
import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import { resolveCalendarLinks } from "@/lib/calendar";
import OutlookCalendar from "@/components/calendar/OutlookCalendar";

const DEFAULT_INTRO =
  "Room availability and upcoming events at the Artificial Intelligence Research Institute.";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);

  return {
    title: about?.roomsCalendarTitle || "Calendar",
    description: about?.roomsCalendarIntro || DEFAULT_INTRO,
    alternates: canonical('/about/calendar'),
  };
}

export default async function Page() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);
  const { icsUrl, embedUrl } = resolveCalendarLinks(about?.roomsCalendarUrl);

  return (
    <OutlookCalendar
      title={about?.roomsCalendarTitle || "Calendar"}
      intro={about?.roomsCalendarIntro || DEFAULT_INTRO}
      icsUrl={icsUrl}
      embedUrl={embedUrl}
    />
  );
}
