"use client";

import CatalogNotice from "@/components/CatalogNotice";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { FaMapMarkerAlt, FaVideo, FaCalendar } from "react-icons/fa";

const motionCard = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.35 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export default function EventsClient({ events = [], pageData }) {
  const items = Array.isArray(events) ? events : [];
  const title = pageData?.title || "Events";
  const subtitle = pageData?.subtitle || "Upcoming and past events organized by the Artificial Intelligence Research Institute at UTCN.";
  const noEvents = pageData?.noEvents || "No events available at the moment.";
  const viewDetailsLabel = pageData?.viewDetails || "View Details";

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    });
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case "online": return <FaVideo className="text-gray-400" />;
      case "hybrid": return <FaMapMarkerAlt className="text-gray-400" />;
      default: return <FaMapMarkerAlt className="text-gray-400" />;
    }
  };

  return (
    <div className="page-container relative bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="content-wrapper content-padding py-12 md:py-16">
        <PageHeader
          title={title}
          subtitle={subtitle}
        />

        <CatalogNotice className="mb-6" />

        {items.length === 0 ? (
          <CatalogNotice isEmpty={true} emptyMessage={noEvents} />
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {items.map((ev, idx) => (
              <motion.article
                key={ev.id ?? ev.slug ?? idx}
                variants={motionCard}
                className="card card-hover overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm"
              >
                <div className="relative">
                  {ev.image ? (
                    <img 
                      src={ev.image} 
                      alt={ev.title} 
                      style={ev.focalPoint ? { objectPosition: `${ev.focalPoint.x || 50}% ${ev.focalPoint.y || 25}%` } : undefined} 
                      className="w-full h-48 object-cover object-[center_25%]" 
                      loading="lazy" 
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-tr from-blue-900 to-indigo-700 flex items-center justify-center text-white/50 text-4xl">
                      <FaCalendar />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="badge bg-white/95 text-gray-800 border border-gray-200 font-semibold shadow-sm">
                      {ev.category || "Event"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <FaCalendar />
                    <span>{formatDate(ev.startDate) || "TBA"}</span>
                    {ev.endDate !== ev.startDate && ev.endDate && (
                      <span> - {formatDate(ev.endDate)}</span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold leading-snug line-clamp-2 text-gray-900 dark:text-white">
                    <Link href={`/news&events/events/${ev.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {ev.title}
                    </Link>
                  </h3>
                  
                  {ev.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                      {ev.description.replace(/(<([^>]+)>)/gi, "")}
                    </p>
                  )}
                </div>

                <div className="px-5 pb-5 pt-2 flex flex-col gap-3 mt-auto">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {getFormatIcon(ev.format)}
                    <span className="truncate">{ev.locationType || ev.format || "Location TBA"}</span>
                  </div>
                  
                  <Link
                    href={`/news&events/events/${ev.slug}`}
                    className="inline-flex items-center justify-center gap-2 w-full py-2 bg-gray-100 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {viewDetailsLabel}
                    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                      <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                    </svg>
                  </Link>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
