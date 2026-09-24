import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import { FaRegCalendarAlt } from "react-icons/fa";
import HistorySection from "./HistorySection";
import MissionClient from "./MissionClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);

  return {
    title: about?.metaTitle || "About – Mission & History",
    description: about?.metaDescription || "Learn about AIRi's mission, history, and role in advancing AI research at the Technical University of Cluj-Napoca.",
  };
}

export default async function AboutPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const about = await getSingleType("about-page", locale);
  // Fetch timeline separately now that they are decoupled
  const timeline = await getSingleType("timeline-page", locale, "events");

  // Map timeline-page fields into format expected by HistorySection
  // (HistorySection expects either items array directly or an aboutData object with timelineEvents)
  const syntheticAboutData = {
    ...about,
    timelineEvents: timeline?.events || [],
  };

  return (
    <>
      <FallbackDisclaimer isFallback={about?._isFallback} />
      <div className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <MissionClient aboutData={about} />
          </div>

          <div className="flex flex-col items-center mb-8 border-t border-gray-200 dark:border-gray-700 pt-10 w-full">
            <FaRegCalendarAlt className="h-8 w-8 mb-2 text-primary-600 dark:text-accent-400" />
            <h2 className="heading-2 heading-accent">
              {timeline?.title || "History & Milestones"}
            </h2>
          </div>

          <HistorySection aboutData={syntheticAboutData} />
        </section>
      </div>
    </div>
    </>
  );
}
