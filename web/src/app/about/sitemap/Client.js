"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.12 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function Client() {
  const t = useTranslations("about.sitemap");
  const [q, setQ] = useState("");

  const SECTIONS = useMemo(() => [
    {
      title: t("sections.research.title"),
      links: [
        { label: t("sections.research.links.departments"), href: "/research/departments" },
        { label: t("sections.research.links.themes"), href: "/research/themes" },
        { label: t("sections.research.links.projects"), href: "/research/projects" },
        { label: t("sections.research.links.publications"), href: "/research/publications" },
        { label: t("sections.research.links.thesis"), href: "/research/thesis" },
        { label: t("sections.research.links.tools"), href: "/research/tools" },
        { label: t("sections.research.links.resources"), href: "/resources" },
      ],
    },
    {
      title: t("sections.engagement.title"),
      links: [
        { label: t("sections.engagement.links.public"), href: "/engagement/public" },
        { label: t("sections.engagement.links.academic"), href: "/engagement/academic" },
        { label: t("sections.engagement.links.industry"), href: "/engagement/industry" },
        { label: t("sections.engagement.links.highSchool"), href: "/engagement/high-school" },
        { label: t("sections.engagement.links.partners"), href: "/engagement/partners" },
        { label: t("sections.engagement.links.industrialPhd"), href: "/engagement/industrial-phd" },
      ],
    },
    {
      title: t("sections.people.title"),
      links: [
        { label: t("sections.people.links.researchers"), href: "/people" },
        { label: t("sections.people.links.staff"), href: "/people" },
        { label: t("sections.people.links.alumni"), href: "/people" },
        { label: t("sections.people.links.visiting"), href: "/people" },
      ],
    },
    {
      title: t("sections.newsEvents.title"),
      links: [
        { label: t("sections.newsEvents.links.news"), href: "/news&events/news" },
        { label: t("sections.newsEvents.links.events"), href: "/news&events/events" },
        { label: t("sections.newsEvents.links.seminars"), href: "/news&events/seminars" },
        { label: t("sections.newsEvents.links.openCalls"), href: "/news&events/open-project-calls" },
        { label: t("sections.newsEvents.links.awards"), href: "/news&events/awards" },
        { label: t("sections.newsEvents.links.careers"), href: "/news&events/careers" },
      ],
    },
    {
      title: t("sections.about.title"),
      links: [
        { label: t("sections.about.links.missionHistory"), href: "/about#mission" },
        { label: t("sections.about.links.organigram"), href: "/about/organigram" },
        { label: t("sections.about.links.sitemap"), href: "/about/sitemap" },
        { label: t("sections.about.links.reports"), href: "/about/reports" },
        { label: t("sections.about.links.regulations"), href: "/about/procedures-regulations" },
        { label: t("sections.about.links.guidelines"), href: "/about/guidelines" },
        { label: t("sections.about.links.virtualTour"), href: "/about/virtual-tour" },
        { label: t("sections.about.links.roomsCalendar"), href: "/about/rooms-calendar" },
        { label: t("sections.about.links.contact"), href: "/contact" },
      ],
    },
    {
      title: t("sections.search.title"),
      links: [
        { label: t("sections.search.links.classic"), href: "/search" },
        { label: t("sections.search.links.chatbot"), href: "/search/chatbot" },
        { label: t("sections.search.links.knowledgeGraph"), href: "/search/knowledge-graph" },
      ],
    },
  ], [t]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SECTIONS;
    return SECTIONS.map(s => ({
      ...s,
      links: s.links.filter(l =>
        s.title.toLowerCase().includes(term) ||
        l.label.toLowerCase().includes(term)
      ),
    })).filter(s => s.links.length > 0);
  }, [q, SECTIONS]);

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <motion.div
        className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-8"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-2xl md:text-3xl font-extrabold mb-4 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
          variants={item}
        >
          {t("title")}
        </motion.h1>

        <motion.div className="mb-6 flex items-center gap-3 justify-center" variants={item}>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("filterPlaceholder")}
            className="w-full md:w-1/2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Filter sitemap"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {t("clear")}
            </button>
          )}
        </motion.div>

        <motion.nav
          aria-labelledby="sitemap-title"
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={container}
        >
          {filtered.map((section) => (
            <motion.section
              key={section.title}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5"
              variants={item}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.links.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link
                        href={link.href}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </motion.nav>

        {filtered.length === 0 && (
          <motion.p className="mt-6 text-gray-600 dark:text-gray-300 text-center" variants={item}>
            {t("noResults", { query: q })}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}