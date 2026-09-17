"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.12 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function Client({ aboutData }) {
  const [q, setQ] = useState("");

  const title = aboutData?.sitemapTitle || "Sitemap";
  const filterPlaceholder = "Filter pages…";
  const clearText = "Clear";
  const noResultsText = `No results for “${q}”.`;

  const SECTIONS = useMemo(() => [
    {
      title: "Research",
      links: [
        { label: "Departments", href: "/research/departments" },
        { label: "Themes", href: "/research/themes" },
        { label: "Projects", href: "/research/projects" },
        { label: "Publications", href: "/research/publications" },
        { label: "Resources", href: "/resources" },
      ],
    },
    {
      title: "Engagement",
      links: [
        { label: "Academic", href: "/engagement/academic" },
        { label: "Industry", href: "/engagement/industry" },
        { label: "High School", href: "/engagement/high-school" },
        { label: "Partners", href: "/engagement/partners" },
        { label: "Industrial PhD", href: "/engagement/industrial-phd" },
      ],
    },
    {
      title: "People",
      links: [
        { label: "Researchers", href: "/people" },
        { label: "Staff", href: "/people" },
      ],
    },
    {
      title: "News & Events",
      links: [
        { label: "News", href: "/news&events/news" },
        { label: "Events", href: "/news&events/events" },
        { label: "Seminars", href: "/news&events/seminars" },
        { label: "Calls for Projects", href: "/news&events/open-project-calls" },
        { label: "Awards", href: "/news&events/awards" },
        { label: "Career Opportunities", href: "/news&events/careers" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "Mission & History", href: "/about#mission" },
        { label: "Organigram", href: "/about/organigram" },
        { label: "Sitemap", href: "/about/sitemap" },
        { label: "Reports", href: "/about/reports" },
        { label: "Regulations", href: "/about/procedures-regulations" },
        { label: "Guidelines", href: "/about/guidelines" },
        { label: "Virtual Tour", href: "/about/virtual-tour" },
        { label: "Rooms & Calendar", href: "/about/rooms-calendar" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Search",
      links: [
        { label: "Classic Search", href: "/search" },
        { label: "Chatbot", href: "/search/chatbot" },
        { label: "Knowledge Graph", href: "/search/knowledge-graph" },
      ],
    },
  ], []);

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
          {title}
        </motion.h1>

        <motion.div className="mb-6 flex items-center gap-3 justify-center" variants={item}>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={filterPlaceholder}
            className="w-full md:w-1/2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Filter sitemap"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {clearText}
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
              aria-label={section.title}
              className="rounded-2xl border border-gray-200 dark:border-white/10 p-5 bg-white dark:bg-gray-900"
              variants={item}
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-800 pb-2">
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </motion.nav>

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {noResultsText}
          </p>
        )}
      </motion.div>
    </div>
  );
}
