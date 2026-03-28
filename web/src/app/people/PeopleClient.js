"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTimes, FaSortAmountDown } from "react-icons/fa";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Safely reads scholarCitationCount from a person object.
 * Returns 0 if missing or invalid so sorting is always stable.
 */
function getCitationCount(person) {
  const value = person?.scholarCitationCount;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// PersonCard Component
// ---------------------------------------------------------------------------

function PersonCard({ person, basePath = "/people" }) {
  const citationCount = getCitationCount(person);

  return (
    <motion.article
      className="card card-hover p-5 transition-all duration-200 hover:shadow-lg dark:hover:shadow-lg/50"
      variants={itemVariants}
      layout
    >
      <Link
        href={`${basePath}/${encodeURIComponent(person.slug)}`}
        className="block text-center"
      >
        {/* Avatar */}
        <div className="relative w-28 h-28 mx-auto mb-3">
          <img
            src={person.image || "/people/Basic_avatar_image.png"}
            alt={person.name}
            width={112}
            height={112}
            loading="lazy"
            className="w-full h-full rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
          />
        </div>

        {/* Name */}
        <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
          {person.name}
        </h2>

        {/* Title */}
        {person.title && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {person.title}
          </p>
        )}

        {/* Department */}
        {person.department && (
          <p className="text-xs text-primary-600 dark:text-accent-400 mt-1 font-medium">
            {person.department}
          </p>
        )}

        {/* Citation Badge — shown for researchers with a Scholar profile */}
        {person.googleScholarUrl && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {citationCount > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20">
                <svg
                  className="w-3 h-3 text-blue-500 dark:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {citationCount.toLocaleString()} citations
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Scholar profile
              </p>
            )}
          </div>
        )}
      </Link>
    </motion.article>
  );
}

// ---------------------------------------------------------------------------
// Sort Options
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: "default",          label: "Default order (A–Z)" },
  { value: "most-citations",   label: "Most cited on Google Scholar (↓ highest first)" },
  { value: "fewest-citations", label: "Fewest citations on Google Scholar (↑ lowest first)" },
];

// ---------------------------------------------------------------------------
// Main PeopleClient Component
// ---------------------------------------------------------------------------

export default function PeopleClient({
  staff = [],
  researchers = [],
  visiting = [],
  alumni = [],
}) {
  const [activeTab, setActiveTab]       = useState("researchers");
  const [searchQuery, setSearchQuery]   = useState("");
  const [researcherSort, setResearcherSort] = useState("default");

  const t = useTranslations("people");

  const TABS = [
    { id: "researchers", label: t("tabs.researchers"), icon: "🔬" },
    { id: "staff",       label: t("tabs.staff"),       icon: "👥" },
    { id: "visiting",    label: t("tabs.visiting"),    icon: "🌍" },
    { id: "alumni",      label: t("tabs.alumni"),      icon: "🎓" },
  ];

  // Normalise all lists once
  const allPeople = useMemo(
    () => ({
      researchers: Array.isArray(researchers) ? researchers : [],
      staff:       Array.isArray(staff)       ? staff       : [],
      visiting:    Array.isArray(visiting)    ? visiting    : [],
      alumni:      Array.isArray(alumni)      ? alumni      : [],
    }),
    [staff, researchers, visiting, alumni]
  );

  // Filter + sort the active tab's list
  const currentPeople = useMemo(() => {
    const list  = allPeople[activeTab] || [];
    const terms = parseSearchTerms(searchQuery);

    const filtered = terms.length
      ? list.filter((p) => {
          const searchable = normalizeSearchText(
            [p.name, p.title, p.department, p.email].filter(Boolean).join(" ")
          );
          return terms.every((term) => searchable.includes(term));
        })
      : list;

    return [...filtered].sort((a, b) => {
      if (activeTab === "researchers") {
        const countA = getCitationCount(a);
        const countB = getCitationCount(b);

        if (researcherSort === "most-citations"   && countA !== countB) return countB - countA;
        if (researcherSort === "fewest-citations" && countA !== countB) return countA - countB;
      }

      // Default: alphabetical, Romanian locale
      return (a?.name || "").localeCompare(b?.name || "", "ro", {
        sensitivity: "base",
        numeric: true,
      });
    });
  }, [allPeople, activeTab, searchQuery, researcherSort]);

  const counts = useMemo(
    () => ({
      researchers: allPeople.researchers.length,
      staff:       allPeople.staff.length,
      visiting:    allPeople.visiting.length,
      alumni:      allPeople.alumni.length,
    }),
    [allPeople]
  );

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Reset sort when leaving the researchers tab
    if (tabId !== "researchers") setResearcherSort("default");
  };

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="page-header-title">{t("title")}</h1>
          <p className="page-header-subtitle">{t("subtitle")}</p>
        </motion.div>

        {/* ── SEARCH BAR ─────────────────────────────────────────────── */}
        <motion.div
          className="max-w-md mx-auto mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-11 pr-10 w-full"
              aria-label="Search people"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Clear search"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* ── TABS ───────────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                  flex items-center gap-2
                  ${
                    isActive
                      ? "bg-primary-600 text-white shadow-md dark:bg-accent-500"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {counts[tab.id]}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── CITATION SORT DROPDOWN (always visible on Researchers tab) ── */}
        {/*
          FIX: Removed the `hasCitationData` guard that was hiding this dropdown.
          The dropdown now always appears on the Researchers tab so users can
          interact with it even before Scholar data is confirmed to be present.
          When all counts are 0, "most-cited" and "fewest-cited" will both
          produce alphabetical order, which is harmless.
        */}
        <AnimatePresence>
          {activeTab === "researchers" && (
            <motion.div
              key="sort-dropdown"
              className="flex justify-center mb-6"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative w-full max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSortAmountDown className="w-4 h-4 text-primary-600 dark:text-accent-400" />
                </div>

                <select
                  value={researcherSort}
                  onChange={(e) => setResearcherSort(e.target.value)}
                  className="input pl-10 pr-10 appearance-none cursor-pointer bg-white dark:bg-gray-800 w-full"
                  aria-label="Sort researchers by citations"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RESULTS INFO ───────────────────────────────────────────── */}
        <AnimatePresence>
          {searchQuery && (
            <motion.p
              className="text-center text-gray-600 dark:text-gray-400 text-sm mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {currentPeople.length === 1
                ? t("results", { count: currentPeople.length, query: searchQuery })
                : t("resultsPlural", { count: currentPeople.length, query: searchQuery })}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── PEOPLE GRID ────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {currentPeople.length === 0 ? (
            <motion.div
              key="empty"
              className="empty-state py-16 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 00-6-6 6 6 0 00-6 6z"
                />
              </svg>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                {searchQuery
                  ? t("emptySearch")
                  : t("emptyTab", {
                      tabName: TABS.find((tObj) => tObj.id === activeTab)?.label.toLowerCase(),
                    })}
              </p>
              {searchQuery && (
                <motion.button
                  onClick={() => setSearchQuery("")}
                  className="btn btn-secondary mt-4 inline-block"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("clearSearch")}
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`${activeTab}-${researcherSort}`}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
            >
              {currentPeople.map((person) => (
                <PersonCard
                  key={person.slug}
                  person={person}
                  basePath="/people"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}