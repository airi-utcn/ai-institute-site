"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { slugify, toPublicationSlug } from "@/lib/slug";
import { FaSearch, FaTimes, FaFilter, FaChevronDown, FaExternalLinkAlt } from "react-icons/fa";
import { containerVariants, itemVariants } from "@/lib/animations";
import { useTranslations } from "next-intl";

const buildStaffLookup = (staffJson) => {
  const arr = Array.isArray(staffJson) ? staffJson : Object.values(staffJson || {}).flat();
  const bySlug = new Map();
  for (const p of arr) {
    const name = p?.name ? String(p.name) : "";
    const slug = p?.slug ? String(p.slug) : "";
    if (slug && name) bySlug.set(slug, name);
  }
  return bySlug;
};

const authorsToNames = (authors, bySlugMap) => {
  const list = Array.isArray(authors) ? authors : [];
  return list
    .map((a) => {
      if (!a) return "";
      if (typeof a === "string") return bySlugMap.get(a) || a;
      if (typeof a === "object") {
        const key = a.slug || a.name || "";
        return bySlugMap.get(key) || key;
      }
      return "";
    })
    .filter(Boolean);
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

const normalizePublication = (p, bySlugMap) => {
  const slug = toPublicationSlug({ slug: p.slug, title: p.title, year: p.year });

  const themeObjs = Array.isArray(p?.themes) ? p.themes : [];
  const themeNames = themeObjs
    .map((t) => (typeof t === "string" ? t : t?.name || ""))
    .map((t) => t.trim())
    .filter(Boolean);

  const themeSlugs = themeObjs
    .map((t) =>
      typeof t === "string" ? slugify(t) : t?.slug || slugify(t?.name || "")
    )
    .filter(Boolean);
  
  return {
    slug,
    title: p.title || "",
    year: typeof p.year === "number" || typeof p.year === "string" ? String(p.year) : "",
    domain: p.domain || "",
    kind: p.kind || "",
    description: p.description || "",
    authors: authorsToNames(p.authors, bySlugMap),
    pdfFile: p.pdfFile || null,
    projects: Array.isArray(p.projects) ? p.projects : [],
    themes: themeNames,
    themeSlugs,
  };
};

export default function PublicationsClient({ publications: pubData, staff: staffData }) {
  const searchParams = useSearchParams();
  const t = useTranslations("research.publications");

  // TODO: This can be replaced with Strapi function
  const staffBySlug = useMemo(() => buildStaffLookup(staffData), [staffData]);

  const pubs = useMemo(() => {
    const src = Array.isArray(pubData) ? pubData : [];
    return src.map((p) => normalizePublication(p, staffBySlug)).filter((p) => p.title);
  }, [pubData, staffBySlug]);

  /* State filters */
  const [q, setQ] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Read theme from URL params (from themes page)
  useEffect(() => {
    const themeParam = searchParams.get("theme");
    if (themeParam) {
      setThemeFilter(themeParam);
      setShowFilters(true);
    }
  }, [searchParams]);

  const { yearOptions, authorOptions, domainOptions, kindOptions } = useMemo(() => {
    const years = new Set();
    const authors = new Set();
    const domains = new Set();
    const kinds = new Set();
    for (const p of pubs) {
      if (p.year) years.add(p.year);
      if (Array.isArray(p.authors)) p.authors.forEach((a) => a && authors.add(a));
      if (p.domain) domains.add(p.domain);
      if (p.kind) kinds.add(p.kind);
    }
    return {
      yearOptions: Array.from(years).sort((a, b) => Number(b) - Number(a)),
      authorOptions: Array.from(authors).sort((a, b) => a.localeCompare(b)),
      domainOptions: Array.from(domains).sort((a, b) => a.localeCompare(b)),
      kindOptions: Array.from(kinds).sort((a, b) => a.localeCompare(b)),
    };
  }, [pubs]);

  /* filtering */
  const filtered = useMemo(() => {
    const terms = parseSearchTerms(q);
    const normalizedThemeFilter = themeFilter.trim().toLowerCase();
    return pubs.filter((p) => {
      const searchable = normalizeSearchText(
        `${p.title} ${p.year} ${p.domain} ${p.kind} ${(p.authors || []).join(" ")}`
      );

      const inSearch =
        !terms.length || terms.every((term) => searchable.includes(term));

      const inYear = !yearFilter || p.year === yearFilter;
      const inAuthor = !authorFilter || (p.authors || []).includes(authorFilter);
      const inDomain = !domainFilter || p.domain === domainFilter;
      const inKind = !kindFilter || p.kind === kindFilter;
      // Theme filter - simple text match on title/domain for now
      const inTheme =
        !normalizedThemeFilter ||
        p.themes?.some((t) => t.toLowerCase().includes(normalizedThemeFilter)) ||
        p.themeSlugs?.some((s) => s.toLowerCase() === normalizedThemeFilter);

      return inSearch && inYear && inAuthor && inDomain && inKind && inTheme;
    });
  }, [pubs, q, yearFilter, authorFilter, domainFilter, kindFilter, themeFilter]);

  const hasActiveFilters = q || yearFilter || authorFilter || domainFilter || kindFilter || themeFilter;

  const clearFilters = () => {
    setQ("");
    setYearFilter("");
    setAuthorFilter("");
    setDomainFilter("");
    setKindFilter("");
    setThemeFilter("");
  };

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="page-header">
            <h1 className="page-header-title">{t("title")}</h1>
            <p className="page-header-subtitle">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* Search bar - prominently placed at top */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="input pl-11 pr-10 text-base"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Filter toggle button */}
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${showFilters || hasActiveFilters
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              `}
            >
              <FaFilter className="text-xs" />
              {t("filters")}
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary-600 text-white">
                  {[yearFilter, authorFilter, domainFilter, kindFilter, themeFilter].filter(Boolean).length}
                </span>
              )}
              <FaChevronDown className={`text-xs transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </motion.div>

          {/* Collapsible filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-8"
              >
                <div className="card p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="label">{t("year")}</label>
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="select"
                      >
                        <option value="">{t("allYears")}</option>
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">{t("author")}</label>
                      <select
                        value={authorFilter}
                        onChange={(e) => setAuthorFilter(e.target.value)}
                        className="select"
                      >
                        <option value="">{t("allAuthors")}</option>
                        {authorOptions.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">{t("department")}</label>
                      <select
                        value={domainFilter}
                        onChange={(e) => setDomainFilter(e.target.value)}
                        className="select"
                      >
                        <option value="">{t("allDepartments")}</option>
                        {domainOptions.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">{t("type")}</label>
                      <select
                        value={kindFilter}
                        onChange={(e) => setKindFilter(e.target.value)}
                        className="select"
                      >
                        <option value="">{t("allTypes")}</option>
                        {kindOptions.map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">{t("theme")}</label>
                      <input
                        value={themeFilter}
                        onChange={(e) => setThemeFilter(e.target.value)}
                        placeholder={t("filterByTheme")}
                        className="input"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-muted">
                        {filtered.length === 1 
                          ? t("publicationsFound", { count: filtered.length }) 
                          : t("publicationsFoundPlural", { count: filtered.length })
                        }
                      </span>
                      <button
                        onClick={clearFilters}
                        className="text-sm text-primary-600 dark:text-accent-400 hover:underline"
                      >
                        {t("clearAllFilters")}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Publications list */}
          <div>
            {filtered.length ? (
              <div className="space-y-4">
                {filtered.map((p, i) => (
                  <motion.div
                    key={`${p.title}-${i}`}
                    variants={itemVariants}
                    className="card card-hover p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {p.slug ? (
                            <Link
                              href={`/research/publications/${encodeURIComponent(p.slug)}`}
                              className="hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
                            >
                              {p.title}
                            </Link>
                          ) : (
                            p.title
                          )}
                        </h3>

                        {/* Metadata badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {p.year && (
                            <span className="badge-primary">{p.year}</span>
                          )}
                          {p.kind && (
                            <span className="badge-gray">{p.kind}</span>
                          )}
                          {p.domain && (
                            <span className="badge-gray">{p.domain}</span>
                          )}
                        </div>

                        {/* Authors */}
                        {p.authors?.length > 0 && (
                          <p className="text-sm text-muted mt-3">
                            <span className="font-medium">{t("authorsLabel")}</span>{" "}
                            {p.authors.join(", ")}
                          </p>
                        )}

                        {/* Description preview */}
                        {p.description && (
                          <p className="text-sm text-muted mt-2 line-clamp-2">
                            {p.description}
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {p.slug && (
                            <Link
                              href={`/research/publications/${encodeURIComponent(p.slug)}`}
                              className="btn btn-primary btn-sm"
                            >
                              {t("viewDetails")}
                            </Link>
                          )}
                          {p.pdfFile?.url && (
                            <a
                              href={p.pdfFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm inline-flex items-center gap-2"
                            >
                              {t("openPdf")}
                              <FaExternalLinkAlt className="text-xs" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>{t("noPublications")}</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="btn btn-secondary mt-4">
                    {t("clearFilters")}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}