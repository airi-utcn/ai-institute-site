"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const categoryLabels = {
  announcement: "Announcements",
  construction: "Construction",
  collaboration: "Collaborations",
  award: "Awards",
  press: "Press",
  other: "Other",
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const motionCard = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.35 } },
};

const getCategoryLabel = (value) => categoryLabels[value] || "Other";

export default function NewsClient({ newsItems = [] }) {
  const items = Array.isArray(newsItems) ? newsItems : [];
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const unique = new Set(items.map((it) => it.category || "other"));
    return ["all", ...Array.from(unique)];
  }, [items]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchesCategory = category === "all" || (it.category || "other") === category;
      const text = `${it.title} ${it.summary}`.toLowerCase();
      const matchesQuery = !term || text.includes(term);
      return matchesCategory && matchesQuery;
    });
  }, [items, category, query]);

  const hero = filtered[0] || null;
  const heroKey = hero ? hero.id ?? hero.slug ?? hero.title : null;
  const gridItems = heroKey ? filtered.filter((it) => (it.id ?? it.slug ?? it.title) !== heroKey) : filtered;

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-gradient text-white rounded-2xl p-8 shadow-lg mb-10 overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="flex-1 space-y-3">
            <p className="text-sm uppercase tracking-[0.25em] text-blue-200">Latest from AIRI</p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">News & Events</h1>
            <p className="text-blue-100 max-w-2xl">
              Fresh stories, research milestones, and press moments curated straight from the Strapi-powered newsroom.
            </p>
          </div>
          <div className="w-full max-w-md bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.2em] text-blue-200 mb-2">Quick filters</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 text-sm rounded-full border transition ${
                      active
                        ? "bg-white text-slate-900 border-white"
                        : "border-white/25 text-white hover:bg-white/10"
                    }`}
                  >
                    {cat === "all" ? "All" : getCategoryLabel(cat)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="bg-white dark:bg-gray-950 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2" htmlFor="news-search">
                Search news
              </label>
              <div className="relative">
                <input
                  id="news-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, keywords, or summaries"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0-2a8 8 0 0 0-6.32 12.906l-2.387 2.4a1 1 0 1 0 1.414 1.415l2.39-2.392A8 8 0 1 0 10 2Z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200 font-semibold">
                {filtered.length}
              </span>
              <span>stories</span>
            </div>
          </div>

          {hero ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10"
            >
              <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                {hero.image ? (
                  <img src={hero.image} alt={hero.title} className="w-full h-80 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-80 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur border border-white/30">
                      {getCategoryLabel(hero.category)}
                    </span>
                    {hero.date && <span className="text-white/80">{formatDate(hero.date)}</span>}
                  </div>
                  <h2 className="text-2xl font-semibold leading-snug">{hero.title}</h2>
                  {hero.summary && <p className="text-white/85 text-sm max-w-2xl line-clamp-2">{hero.summary}</p>}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {Array.isArray(hero.tags) && hero.tags.length > 0 &&
                      hero.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-white/15 text-xs border border-white/20">
                          {tag}
                        </span>
                      ))}
                  </div>
                  <div className="pt-2">
                    <a
                      href={hero.linkUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-blue-200"
                    >
                      Read story
                      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                        <path fill="currentColor" d="M13 5a1 1 0 1 0 0 2h3.586l-7.293 7.293a1 1 0 0 0 1.414 1.414L18 8.414V12a1 1 0 1 0 2 0V5h-7Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Spotlight</h3>
                  {hero.date && <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(hero.date)}</span>}
                </div>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-5">{hero.summary || "No summary provided yet."}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 text-xs font-semibold">
                    {getCategoryLabel(hero.category)}
                  </span>
                  {Array.isArray(hero.tags) && hero.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="pt-2">
                  <a
                    href={hero.linkUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-yellow-400 hover:underline"
                  >
                    Open article
                    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                      <path fill="currentColor" d="M13 5a1 1 0 1 0 0 2h3.586l-7.293 7.293a1 1 0 0 0 1.414 1.414L18 8.414V12a1 1 0 1 0 2 0V5h-7Z" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400 py-10">No news available at the moment.</p>
          )}

          {gridItems.length > 0 && (
            <div className="grid-cards">
              {gridItems.map((item) => (
                <motion.article
                  key={item.id ?? item.slug ?? item.title}
                  variants={motionCard}
                  initial="hidden"
                  animate="visible"
                  className="card card-hover overflow-hidden flex flex-col"
                >
                  <div className="relative">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-48 object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">No image</div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="badge bg-white/95 text-gray-800 border border-gray-200">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 p-5 space-y-3">
                    {item.date && <div className="text-xs uppercase tracking-[0.15em] text-gray-500">{formatDate(item.date)}</div>}
                    <h3 className="text-lg font-semibold leading-snug line-clamp-2">{item.title}</h3>
                    {item.summary && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{item.summary}</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Array.isArray(item.tags) && item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge-gray">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <a
                      href={item.linkUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-accent inline-flex items-center gap-2 text-sm font-semibold"
                    >
                      Read more
                      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                        <path fill="currentColor" d="M13 5a1 1 0 1 0 0 2h3.586l-7.293 7.293a1 1 0 0 0 1.414 1.414L18 8.414V12a1 1 0 1 0 2 0V5h-7Z" />
                      </svg>
                    </a>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
