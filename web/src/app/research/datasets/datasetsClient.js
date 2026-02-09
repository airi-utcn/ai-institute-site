"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

/* Animations */
const containerVariants = {
  hidden: { opacity: 0.9 }, visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function DatasetsClient({ datasets = [] }) {
  const allDatasets = datasets;

  /* --- State filtre --- */
  const [q, setQ] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const { authorOptions, yearOptions } = useMemo(() => {
    const authors = new Map();
    const years = new Set();

    for (const d of allDatasets) {
      if (d.authorSlug) authors.set(d.authorSlug, d.authorName || d.authorSlug);
      if (d.year) years.add(String(d.year));
    }

    return {
      authorOptions: Array.from(authors.entries()).map(([slug, label]) => ({ value: slug, label })),
      yearOptions: Array.from(years).sort((a, b) => Number(b) - Number(a)),
    };
  }, [allDatasets]);

  // Filtering
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return allDatasets.filter((d) => {
      const inSearch =
        !query ||
        `${d.title} ${d.description} ${d.authorName}`.toLowerCase().includes(query);

      const inAuthor = !authorFilter || d.authorSlug === authorFilter;
      const inYear = !yearFilter || String(d.year) === String(yearFilter);

      return inSearch && inAuthor && inYear;
    });
  }, [allDatasets, q, authorFilter, yearFilter]);

  const clearFilters = () => {
    setQ("");
    setAuthorFilter("");
    setYearFilter("");
  };

  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.h1
            variants={itemVariants}
            className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400 text-center"
          >
            Datasets
          </motion.h1>

          {/* GRID: sidebar (filters) + content */}
          <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
            <aside className="md:-ml-6">
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title, description, author…"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />

                <select
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">Filter by author…</option>
                  {authorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">Filter by year…</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full text-sm underline mt-1 opacity-80 hover:opacity-100"
                >
                  Reset filters
                </button>
              </div>
            </aside>

            {/* Content */}
            <div>
              <motion.div
                key={`${authorFilter}|${q}|${yearFilter}`}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-gray-200 dark:border-gray-800 p-5"
              >
                {filtered.length ? (
                  <ul className="space-y-2">
                    {filtered.map((d, idx) => (
                      <li
                        key={`${d.authorSlug}-${idx}-${d.title}`}
                        className="rounded-lg border border-gray-100 dark:border-gray-800 p-3"
                      >
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {d.title}
                        </div>
                        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          {d.description}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    No datasets match your filters.
                  </p>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
