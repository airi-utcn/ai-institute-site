"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import Link from "next/link";
import { FaUser } from "react-icons/fa";

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
  
  const regex = new RegExp("(" + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
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

export default function ArchiveClient({ newsItems = [], pageData }) {
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const t = (key) => {
    const map = {
      "article.backToNews": pageData?.articleBackToNews || "Back to News",
      archiveTitle: pageData?.newsTitle ? `${pageData.newsTitle} Archive` : "News Archive",
      searchPlaceholder: pageData?.newsSearchPlaceholder || "Search archive stories...",
      viewArticle: pageData?.newsViewArticle || "Read full article",
      readMore: pageData?.newsReadMore || "Read external story",
      emptyState: pageData?.newsEmptyState || "No archived news found matching your criteria.",
    };
    return map[key] || key;
  };

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  };

  const filtered = useMemo(() => {
    const terms = parseSearchTerms(query);
    return newsItems.filter((it) => {
      const text = normalizeSearchText(`${it.title} ${it.summary}`);
      return !terms.length || terms.every((term) => text.includes(term));
    });
  }, [newsItems, query]);

  return (
    <div className="page-container max-w-5xl mx-auto py-12">
      <div className="mb-8">
        <Link href="/news&events/news" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-6 font-medium">
          <svg viewBox="0 0 24 24" className="w-4 h-4 rotate-180" aria-hidden="true">
             <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          {t("article.backToNews")}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">{t("archiveTitle")}</h1>
        <div className="relative max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          />
          <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0-2a8 8 0 0 0-6.32 12.906l-2.387 2.4a1 1 0 1 0 1.414 1.415l2.39-2.392A8 8 0 1 0 10 2Z" />
          </svg>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {filtered.length > 0 ? filtered.map((item) => (
          <div key={item.id ?? item.slug ?? item.title} className="p-5 sm:p-6 flex flex-col md:flex-row gap-4 md:items-start justify-between hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
             <div className="flex-1 space-y-2">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">{formatDate(item.date)}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-snug"><Highlight text={item.title} highlight={query} /></h3>
                {item.summary && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2"><Highlight text={item.summary} highlight={query} /></p>}
             </div>
             <div className="shrink-0 flex items-center md:flex-col lg:flex-row gap-4 mt-2 md:mt-0 font-medium">
               {item.slug && (
                 <Link href={`/news&events/news/${item.slug}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center gap-1.5 whitespace-nowrap">
                   {t("viewArticle")}
                   <svg viewBox="0 0 24 24" className="w-4 h-4 -rotate-45" aria-hidden="true"><path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                 </Link>
               )}
               {hasNewsLink(item.linkUrl) && (
                 <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-sm inline-flex items-center gap-1.5 whitespace-nowrap">
                   {t("readMore")}
                   <svg viewBox="0 0 24 24" className="w-4 h-4 -rotate-45" aria-hidden="true"><path fill="currentColor" d="M13 5a1 1 0 1 0 0 2h3.586l-7.293 7.293a1 1 0 0 0 1.414 1.414L18 8.414V12a1 1 0 1 0 2 0V5h-7Z" /></svg>
                 </a>
               )}
             </div>
          </div>
        )) : (
          <div className="p-8 text-center text-gray-500">{t("emptyState")}</div>
        )}
      </div>
    </div>
  );
}
