"use client";

import CatalogNotice from "@/components/CatalogNotice";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { FaCalendar, FaClock, FaMapMarkerAlt, FaUsers } from "react-icons/fa";

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const formatCategory = (value) =>
  String(value || "event")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function SeminarsClient({ events = [], pageData }) {
  const items = Array.isArray(events) ? events : [];
  const title = pageData?.seminarsTitle || "Scientific Events";
  const subtitle =
    pageData?.seminarsSubtitle ||
    "Seminars, workshops, conferences, invited lectures, and project meetings organized within AIRi projects.";
  const emptyState = pageData?.seminarsEmptyState || "No scientific events available.";
  const agendaLabel = pageData?.seminarsAgenda || "Agenda";
  const projectLabel = pageData?.seminarsProject || "Project";

  return (
    <main className="page-container relative bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="content-wrapper content-padding py-12 md:py-16">
        <PageHeader title={title} subtitle={subtitle} />
        <CatalogNotice className="mb-6" />

        {items.length === 0 ? (
          <CatalogNotice isEmpty emptyMessage={emptyState} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((event) => (
              <article
                key={event.id || event.slug}
                className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  <span>{formatCategory(event.category)}</span>
                  {event.projects?.length ? <span>{projectLabel}</span> : null}
                </div>
                <h2 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                  <Link href={`/news&events/events/${event.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                    {event.title}
                  </Link>
                </h2>
                {event.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {event.description}
                  </p>
                ) : null}

                <div className="mt-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {event.startDate ? (
                    <div className="flex items-start gap-2">
                      <FaCalendar className="mt-1 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>
                        {formatDateTime(event.startDate)}
                        {event.endDate ? ` – ${formatDateTime(event.endDate)}` : ""}
                      </span>
                    </div>
                  ) : null}
                  {event.location || event.format ? (
                    <div className="flex items-start gap-2">
                      <FaMapMarkerAlt className="mt-1 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>{event.location || event.format}</span>
                    </div>
                  ) : null}
                  {event.participants?.length ? (
                    <div className="flex items-start gap-2">
                      <FaUsers className="mt-1 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>{event.participants.map((speaker) => speaker.name).filter(Boolean).join(", ")}</span>
                    </div>
                  ) : null}
                </div>

                {event.projects?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.projects.map((project) => (
                      <Link
                        key={project.slug || project.id}
                        href={`/research/projects/${project.slug}`}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:underline dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        {project.title}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {event.agenda?.length ? (
                  <details className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      <FaClock className="text-blue-600 dark:text-blue-400" />
                      {agendaLabel}
                    </summary>
                    <div className="mt-3 space-y-3">
                      {event.agenda.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                          <div className="flex justify-between gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                            <span>{item.title}</span>
                            <span className="whitespace-nowrap text-xs text-gray-500">
                              {item.startTime}{item.endTime ? ` – ${item.endTime}` : ""}
                            </span>
                          </div>
                          {item.speakers?.length ? (
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                              {item.speakers.map((speaker) => speaker.name).filter(Boolean).join(", ")}
                            </p>
                          ) : null}
                          {item.description ? (
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{item.description}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
