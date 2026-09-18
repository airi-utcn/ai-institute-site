"use client";

import CatalogNotice from "@/components/CatalogNotice";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const CALENDAR_EMBED_URL_RAW =
  "https://outlook.office365.com/owa/calendar/03fcfa83c4ac48e1ba0031c55a958c35@campus.utcluj.ro/4deb95cb924d4d80ae21dd1a539599a014540741905280907663/calendar.ics";

const CALENDAR_EMBED_URL = CALENDAR_EMBED_URL_RAW.replace(/calendar\.ics(\?.*)?$/i, "calendar.html$1");

export default function EventsClient({ events = [], pageData }) {
  const items = Array.isArray(events) ? events : [];
  const title = pageData?.tabEvents || "Events";
  const subtitle = "Upcoming and past events organized by the Artificial Intelligence Research Institute at UTCN.";
  const calendarTitle = "Public Calendar";
  const noEvents = "No events available at the moment.";

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <PageHeader
          title={title}
          subtitle={subtitle}
        />

        {/* Calendar section */}
        {/* <section className="mb-10">
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="heading-3">{calendarTitle}</h2>
            </div>
            <div className="p-5">
              <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                <div
                  className="overflow-x-auto md:overflow-x-visible -mx-5 md:mx-0"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehaviorX: "contain",
                  }}
                >
                  <div className="inline-block w-[1100px] md:w-full">
                    <iframe
                      title="AIRI Institute Calendar"
                      src={CALENDAR_EMBED_URL}
                      className="w-[1100px] md:w-full"
                      style={{ height: "80vh" }}
                      loading="lazy"
                      scrolling="no"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>*/}

        <CatalogNotice className="mb-6" />

        {/* Events List */}
        {items.length === 0 ? (
          <CatalogNotice isEmpty={true} emptyMessage={noEvents} />
        ) : (
          <motion.ul
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {items.map((ev, idx) => (
              <motion.li
                key={`${ev.title}-${idx}`}
                className="card card-hover"
                variants={itemVariants}
              >
                <div className="p-5">
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base md:text-lg font-semibold leading-snug link-accent"
                  >
                    {ev.title}
                  </a>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
}
