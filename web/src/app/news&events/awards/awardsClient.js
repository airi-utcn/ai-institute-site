"use client";

import CatalogNotice from "@/components/CatalogNotice";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/context/LocaleContext";
import Link from "next/link";
import { FaUser } from "react-icons/fa";

const motionCard = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.35 } },
};

const normalizeSearchText = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const parseSearchTerms = (query) =>
  normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean);

const hasNewsLink = (value) => typeof value === "string" && value.trim().length > 0;

const Highlight = ({ text = "", highlight = "" }) => {
  if (!highlight.trim() || !text) return <>{text}</>;
  const terms = parseSearchTerms(highlight).filter(Boolean);
  if (!terms.length) return <>{text}</>;

  const regex = new RegExp("(" + terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  const splitted = text.toString().split(regex);
  return (
    <>
      {splitted.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit px-1 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function AwardsClient({ awardsItems = [], pageData }) {
  const items = Array.isArray(awardsItems) ? awardsItems : [];
  const [query, setQuery] = useState("");

  const locale = useLocale();
  const authorLabel = "By";

  const t = (key) => {
    const map = {
      latest: pageData?.newsLatest || "Latest from AIRi",
      title: pageData?.awardsTitle || "Awards",
      subtitle: pageData?.awardsSubtitle || "Recognizing excellence, impactful contributions, and research achievements across the Artificial Intelligence Research Institute.",
      searchLabel: pageData?.awardsSearchLabel || "Search awards",
      searchPlaceholder: pageData?.awardsSearchPlaceholder || "Search by keyword, recipient, or tag...",
      awards: pageData?.awardsStories || "awards",
      viewArticle: pageData?.awardsViewArticle || "Read full article",
      readStory: pageData?.awardsReadStory || "Read full story",
      emptyState: pageData?.awardsEmptyState || "No awards found matching your criteria.",
      noImage: pageData?.awardsNoImage || "No image available",
    };
    return map[key] || key;
  };

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  };

  const renderAuthor = (author, textClassName) => {
    if (!author?.name) return null;

    const content = (
      <span className={`inline-flex items-center gap-1.5 ${textClassName}`}>
        <FaUser className="w-3.5 h-3.5" />
        <span>
          {authorLabel} <span className="font-semibold">{author.name}</span>
          {author.title ? <span className="font-normal"> · {author.title}</span> : null}
        </span>
      </span>
    );

    if (!author.slug) return content;

    return (
      <Link href={`/people/${author.slug}`} className="inline-flex items-center hover:text-current transition-colors">
        {content}
      </Link>
    );
  };

  const filtered = useMemo(() => {
    const terms = parseSearchTerms(query);

    return items.filter((item) => {
      const searchable = normalizeSearchText(
        [
          item.title,
          item.summary,
          item.author?.name,
          item.author?.title,
          ...(item.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
      );

      const matchQuery =
        !terms.length || terms.every((term) => searchable.includes(term));

      return matchQuery;
    });
  }, [items, query]);

  const hero = filtered[0] || null;

  const heroKey = hero ? hero.id ?? hero.slug ?? hero.title : null;
  const allGridItems = heroKey ? filtered.filter((it) => (it.id ?? it.slug ?? it.title) !== heroKey) : filtered;

  return (
    <div className="space-y-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl bg-gradient-to-r from-yellow-500 via-yellow-600 to-amber-700 text-white p-8 sm:p-12 shadow-xl"
      >
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-white drop-shadow-md">{t("title")}</h1>
            <p className="text-yellow-50 max-w-2xl drop-shadow-sm">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="bg-white dark:bg-gray-950 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2" htmlFor="news-search">
                {t("searchLabel")}
              </label>
              <div className="relative">
                <input
                  id="news-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
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
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-200 font-semibold">
                {filtered.length}
              </span>
              <span>{t("awards")}</span>
            </div>
          </div>

          <CatalogNotice className="mb-6" />

          {hero ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10"
            >
              <div className="lg:col-span-5 relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                {hero.image ? (
                  <img src={hero.image} alt={hero.title} style={hero.focalPoint ? { objectPosition: `${hero.focalPoint.x || 50}% ${hero.focalPoint.y || 25}%` } : undefined} className="w-full h-80 object-cover object-[center_25%]" loading="lazy" />
                ) : (
                  <div className="w-full h-80 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
                    {hero.date && <span className="text-yellow-400 font-bold">{formatDate(hero.date)}</span>}
                  </div>
                  {hero.author && <div className="text-sm">{renderAuthor(hero.author, "text-white/80")}</div>}
                  <h2 className="text-2xl font-semibold leading-snug"><Highlight text={hero.title} highlight={query} /></h2>
                  {hero.summary && <p className="text-white/85 text-sm max-w-2xl line-clamp-2"><Highlight text={hero.summary} highlight={query} /></p>}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {Array.isArray(hero.tags) && hero.tags.length > 0 &&
                      hero.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-white/15 text-xs border border-white/20">
                          {tag}
                        </span>
                      ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-3">
                    {hero.slug && (
                      <Link
                        href={`/news&events/awards/${hero.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-300 hover:text-yellow-100 transition-colors"
                      >
                        {t("viewArticle")}
                        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                          <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                        </svg>
                      </Link>
                    )}
                    {hasNewsLink(hero.linkUrl) && (
                      <a
                        href={hero.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors"
                      >
                        {t("readStory")}
                        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                          <path fill="currentColor" d="M13 5a1 1 0 1 0 0 2h3.586l-7.293 7.293a1 1 0 0 0 1.414 1.414L18 8.414V12a1 1 0 1 0 2 0V5h-7Z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              </motion.div>
          ) : (
            <CatalogNotice
            isEmpty={true}
            emptyMessage={t("emptyState")}
            hasActiveFilters={Boolean(query)}
            onClearFilters={() => { setQuery(""); }}
          />
          )}

          {allGridItems.length > 0 && (
            <div className="grid-cards">
              {allGridItems.map((item) => (
                <motion.article
                  key={item.id ?? item.slug ?? item.title}
                  variants={motionCard}
                  initial="hidden"
                  animate="visible"
                  className="card card-hover overflow-hidden flex flex-col"
                >
                  <div className="relative">
                    {item.image ? (
                      <img src={item.image} alt={item.title} style={item.focalPoint ? { objectPosition: `${item.focalPoint.x || 50}% ${item.focalPoint.y || 25}%` } : undefined} className="w-full h-48 object-cover object-[center_25%]" loading="lazy" />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">{t("noImage")}</div>
                    )}
                  </div>

                  <div className="flex-1 p-5 space-y-3">
                    {item.date && <div className="text-xs uppercase tracking-[0.15em] text-yellow-600 dark:text-yellow-500 font-bold">{formatDate(item.date)}</div>}
                    {item.author && <div className="text-sm text-gray-500 dark:text-gray-400">{renderAuthor(item.author, "text-gray-500 dark:text-gray-400")}</div>}
                    <h3 className="text-lg font-semibold leading-snug line-clamp-2"><Highlight text={item.title} highlight={query} /></h3>
                    {item.summary && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3"><Highlight text={item.summary} highlight={query} /></p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Array.isArray(item.tags) && item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge-gray">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex flex-wrap items-center gap-4">
                    {item.slug && (
                      <Link
                        href={`/news&events/awards/${item.slug}`}
                        className="link-accent inline-flex items-center gap-2 text-sm font-semibold !text-amber-600 dark:!text-amber-500"
                      >
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
                        className="link font-semibold inline-flex items-center gap-2 text-sm"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
