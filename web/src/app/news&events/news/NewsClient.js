"use client";

import CatalogNotice from "@/components/CatalogNotice";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/context/LocaleContext";
import Link from "next/link";
import { FaUser, FaSearch, FaTimes, FaNewspaper } from "react-icons/fa";
import SmartMediaImage from "@/components/shared/SmartMediaImage";

// ─── Motion ──────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeSearchText = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const parseSearchTerms = (query) =>
  normalizeSearchText(query).split(/\s+/).filter(Boolean);

const hasNewsLink = (value) =>
  typeof value === "string" && value.trim().length > 0;

const resolveImageUrl = (image) => {
  const media =
    image?.data?.attributes || image?.data || image?.attributes || image;
  const url = media?.url;
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_STRAPI_URL || "").replace(/\/+$/, "");
  return `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
};

const Highlight = ({ text = "", highlight = "" }) => {
  if (!highlight.trim() || !text) return <>{text}</>;
  const terms = parseSearchTerms(highlight).filter(Boolean);
  if (!terms.length) return <>{text}</>;
  const regex = new RegExp(
    "(" +
      terms
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|") +
      ")",
    "gi"
  );
  const splitted = text.toString().split(regex);
  return (
    <>
      {splitted.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit px-1 rounded-sm"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewsClient({ newsItems = [], pageData }) {
  const items = Array.isArray(newsItems) ? newsItems : [];
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const locale = useLocale();
  const authorLabel = "By";

  // ── i18n ──
  const t = (key) => {
    const map = {
      latest: pageData?.newsLatest || "Latest from AIRi",
      title: pageData?.newsTitle || "News & Stories",
      subtitle:
        pageData?.newsSubtitle ||
        "Updates, breakthroughs, and community highlights from the Artificial Intelligence Research Institute.",
      quickFilters: pageData?.newsQuickFilters || "Filter by topic",
      searchLabel: pageData?.newsSearchLabel || "Search stories",
      searchPlaceholder:
        pageData?.newsSearchPlaceholder ||
        "Search by keyword, author, or tag...",
      stories: pageData?.newsStories || "stories",
      spotlight: pageData?.newsSpotlight || "Spotlight Story",
      noSummary: pageData?.newsNoSummary || "No summary provided.",
      viewArticle:
        pageData?.newsViewArticle || pageData?.newsReadMore || "Read full article",
      readStory: pageData?.newsReadStory || "Read full story",
      openArticle: pageData?.newsOpenArticle || "Open Article",
      emptyState:
        pageData?.newsEmptyState || "No news found matching your criteria.",
      noImage: pageData?.newsNoImage || "No image available",
      "categories.all": pageData?.categoryAll || "All",
      goToArchive: "View News Archive",
    };
    return map[key] || key;
  };

  // ── Formatters ──
  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getCategoryLabel = (value) => {
    const labels = {
      announcement: pageData?.categoryAnnouncement || "Announcement",
      construction: pageData?.categoryConstruction || "Construction",
      collaboration: pageData?.categoryCollaboration || "Collaboration",
      award: pageData?.categoryAward || "Award",
      press: pageData?.categoryPress || "Press",
      other: pageData?.categoryOther || "Other",
      all: pageData?.categoryAll || "All",
    };
    return (
      labels[value] ||
      (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Other")
    );
  };

  const renderAuthor = (author, textClassName) => {
    if (!author?.name) return null;
    const content = (
      <span className={`inline-flex items-center gap-1.5 ${textClassName}`}>
        <FaUser className="w-3.5 h-3.5" />
        <span>
          {authorLabel} <span className="font-semibold">{author.name}</span>
          {author.title ? (
            <span className="font-normal"> · {author.title}</span>
          ) : null}
        </span>
      </span>
    );
    if (!author.slug) return content;
    return (
      <Link
        href={`/people/${author.slug}`}
        className="inline-flex items-center hover:text-current transition-colors"
      >
        {content}
      </Link>
    );
  };

  // ── Derived state ──
  const heroImageUrl = resolveImageUrl(pageData?.heroImage);

  const categories = useMemo(() => {
    const set = new Set(["all"]);
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    const terms = parseSearchTerms(query);
    return items.filter((item) => {
      const matchCategory = category === "all" || item.category === category;
      const searchable = normalizeSearchText(
        [
          item.title,
          item.summary,
          item.category,
          item.author?.name,
          item.author?.title,
          ...(item.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
      );
      const matchQuery =
        !terms.length || terms.every((term) => searchable.includes(term));
      return matchCategory && matchQuery;
    });
  }, [items, category, query]);

  const hero = filtered[0] || null;
  const heroKey = hero ? (hero.id ?? hero.slug ?? hero.title) : null;
  const allGridItems = heroKey
    ? filtered.filter((it) => (it.id ?? it.slug ?? it.title) !== heroKey)
    : filtered;

  const DISPLAY_LIMIT = 16;
  const gridItems = query.trim()
    ? allGridItems
    : allGridItems.slice(0, DISPLAY_LIMIT - 1);
  const hasMore =
    !query.trim() && allGridItems.length > DISPLAY_LIMIT - 1;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">

      {/* ── Page Header (mirrors Laboratories) ── */}
      <section className="relative overflow-hidden pt-12 pb-10 md:pt-16 md:pb-14 border-b border-gray-100 dark:border-gray-900 bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-gray-900/40 dark:via-[#0a0a0a] dark:to-[#0a0a0a]">
        {heroImageUrl && (
          <>
            <img
              src={heroImageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-25"
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/70 to-white dark:from-gray-950/30 dark:via-gray-950/75 dark:to-[#0a0a0a]"
              aria-hidden="true"
            />
          </>
        )}

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 mb-4">
              <FaNewspaper className="w-3 h-3" />
              <span>{t("latest")}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
              {t("title")}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          {/* Search + Filter Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            {categories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      category === cat
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {cat === "all" ? t("categories.all") : getCategoryLabel(cat)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10">

        <CatalogNotice />

        {/* Spotlight / Hero card */}
        {hero ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <Link
              href={hero.slug ? `/news&events/news/${hero.slug}` : "#"}
              className="group block relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-sm hover:shadow-xl transition-shadow duration-300"
            >
              <SmartMediaImage
                src={hero.image}
                alt={hero.title}
                focalPoint={hero.focalPoint}
                aspectRatio="aspect-[21/9]"
                className="max-h-96"
                loading="lazy"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
              {/* Text overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2 pointer-events-none">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur border border-white/30">
                    {getCategoryLabel(hero.category)}
                  </span>
                  {hero.date && (
                    <span className="text-white/80">{formatDate(hero.date)}</span>
                  )}
                </div>
                {hero.author && (
                  <div className="text-sm pointer-events-auto">
                    {renderAuthor(hero.author, "text-white/80")}
                  </div>
                )}
                <h2 className="text-2xl font-semibold leading-snug group-hover:text-blue-200 transition-colors">
                  <Highlight text={hero.title} highlight={query} />
                </h2>
                {hero.summary && (
                  <p className="text-white/85 text-sm max-w-2xl line-clamp-2">
                    <Highlight text={hero.summary} highlight={query} />
                  </p>
                )}
                {Array.isArray(hero.tags) && hero.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {hero.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-white/15 text-xs border border-white/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {hasNewsLink(hero.linkUrl) && (
                  <div className="pt-1 pointer-events-auto">
                    <a
                      href={hero.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors"
                    >
                      {t("readStory")}
                      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                        <path fill="currentColor" d="M13 5a1 1 0 1 0 0 2h3.586l-7.293 7.293a1 1 0 0 0 1.414 1.414L18 8.414V12a1 1 0 1 0 2 0V5h-7Z" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ) : (
          <CatalogNotice
            isEmpty={true}
            emptyMessage={t("emptyState")}
            hasActiveFilters={Boolean(query || category !== "all")}
            onClearFilters={() => {
              setQuery("");
              setCategory("all");
            }}
          />
        )}

        {/* Card Grid */}
        {gridItems.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {gridItems.map((item) => (
              <motion.article
                key={item.id ?? item.slug ?? item.title}
                variants={itemVariants}
                className="group relative flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/50 dark:hover:border-blue-400/50 overflow-hidden"
              >
                {/* Image */}
                {item.image ? (
                  <SmartMediaImage
                    src={item.image}
                    alt={item.title}
                    focalPoint={item.focalPoint}
                    aspectRatio="aspect-video"
                    imageClassName="group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                    <FaNewspaper className="w-8 h-8 opacity-40" />
                  </div>
                )}

                {/* Category badge */}
                <div className="absolute top-3 left-3 z-20">
                  <span className="badge bg-white/95 text-gray-800 border border-gray-200 shadow-sm">
                    {getCategoryLabel(item.category)}
                  </span>
                </div>

                {/* Body */}
                <div className="flex-1 p-5 space-y-2">
                  {item.date && (
                    <div className="text-xs uppercase tracking-[0.15em] text-gray-500">
                      {formatDate(item.date)}
                    </div>
                  )}
                  {item.author && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {renderAuthor(item.author, "text-gray-500 dark:text-gray-400")}
                    </div>
                  )}
                  <h3 className="text-lg font-semibold leading-snug line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <Highlight text={item.title} highlight={query} />
                  </h3>
                  {item.summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                      <Highlight text={item.summary} highlight={query} />
                    </p>
                  )}
                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge-gray">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-4">
                  {item.slug && (
                    <Link
                      href={`/news&events/news/${item.slug}`}
                      className="link-accent inline-flex items-center gap-1.5 text-sm font-semibold"
                    >
                      {/* Full card is visually clickable via absolute overlay */}
                      <span className="absolute inset-0 z-10" aria-hidden="true" />
                      {t("viewArticle")}
                      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                        <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                      </svg>
                    </Link>
                  )}
                  {hasNewsLink(item.linkUrl) && (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="relative z-20 link font-semibold inline-flex items-center gap-1.5 text-sm"
                    >
                      {t("readStory")}
                      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                        <path fill="currentColor" d="M13 5a1 1 0 1 0 0 2h3.586l-7.293 7.293a1 1 0 0 0 1.414 1.414L18 8.414V12a1 1 0 1 0 2 0V5h-7Z" />
                      </svg>
                    </a>
                  )}
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        {/* Archive link */}
        {hasMore && (
          <div className="text-center">
            <Link
              href="/news&events/news/archive"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              {t("goToArchive")}
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
