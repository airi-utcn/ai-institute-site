"use client";

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

export default function EventsClient({ events = [] }) {
  const items = Array.isArray(events) ? events : [];

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <PageHeader
          title="Events"
          subtitle="Highlights and memorable moments from AIRI."
        />

        {/* Calendar section */}
        <section className="mb-10">
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="heading-3">Institute Calendar</h2>
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
        </section>

        {/* Events List */}
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No events available at the moment.</p>
          </div>
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
    </main>
  );
}
