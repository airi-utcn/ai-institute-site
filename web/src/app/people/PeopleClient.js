"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch,
  FaTimes,
  FaSortAmountDown,
  FaFlask,
  FaUserTie,
  FaGraduationCap,
  FaGlobe,
  FaHandshake,
  FaTrophy,
} from "react-icons/fa";
import { useTranslations } from "next-intl";

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

function getCitationCount(person) {
  const value = person?.scholarCitationCount;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return 0;
}

const getRoleConfig = (type) => {
  const configs = {
    researcher: {
      label: "Researcher",
      icon: FaFlask,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      chipColor: "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700",
    },
    staff: {
      label: "Staff",
      icon: FaUserTie,
      color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
      chipColor: "bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700",
    },
    student: {
      label: "Student",
      icon: FaGraduationCap,
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      chipColor: "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700",
    },
    visiting: {
      label: "Visiting",
      icon: FaGlobe,
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      chipColor: "bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700",
    },
    visiting_researcher: {
      label: "Visiting",
      icon: FaGlobe,
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      chipColor: "bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700",
    },
    external: {
      label: "External",
      icon: FaHandshake,
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      chipColor: "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700",
    },
    alumni: {
      label: "Alumni",
      icon: FaTrophy,
      color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
      chipColor: "bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700",
    },
  };

  return configs[type] || configs.researcher;
};

const formatSubtypeLabel = (subtype) => {
  if (!subtype) return null;

  return subtype
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

function PersonCard({ person, basePath = "/people", showRoleBadge = false, activeFilter = "all" }) {
  const citationCount = getCitationCount(person);
  const subtypeLabel = formatSubtypeLabel(person.subtype);
  const roleConfig = getRoleConfig(person.type);
  const RoleIcon = roleConfig.icon;

  const getBadgeLabel = () => {
    if (activeFilter === "all") {
      if (subtypeLabel) return `${roleConfig.label} • ${subtypeLabel}`;
      return roleConfig.label;
    }
    if (subtypeLabel) return subtypeLabel;
    return roleConfig.label;
  };

  const shouldShowBadge = showRoleBadge && (subtypeLabel || (activeFilter === "all" && showRoleBadge));

  return (
    <motion.article
      className="card card-hover p-5 transition-all duration-200 hover:shadow-lg dark:hover:shadow-lg/50"
      variants={itemVariants}
      layout
    >
      <Link href={`${basePath}/${encodeURIComponent(person.slug)}`} className="block text-center">
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

        <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">{person.name}</h2>

        {shouldShowBadge && (
          <div className="flex items-center justify-center gap-1 mt-2 px-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${roleConfig.color}`}
            >
              <RoleIcon className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="whitespace-nowrap">{getBadgeLabel()}</span>
            </span>
          </div>
        )}

        {person.title && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{person.title}</p>
        )}

        {person.department && (
          <p className="text-xs text-primary-600 dark:text-accent-400 mt-1 font-medium">{person.department}</p>
        )}

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
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Scholar profile</p>
            )}
          </div>
        )}
      </Link>
    </motion.article>
  );
}

const RESEARCHER_SORT_OPTIONS = [
  { value: "default", label: "Default order (A–Z)" },
  { value: "most-citations", label: "Most cited on Google Scholar (↓ highest first)" },
  { value: "fewest-citations", label: "Fewest citations on Google Scholar (↑ lowest first)" },
];

export default function PeopleClient({
  staff = [],
  researchers = [],
  visiting = [],
  students = [],
  external = [],
  alumni = [],
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [researcherSort, setResearcherSort] = useState("default");
  const t = useTranslations("people");

  const allPeopleFlat = useMemo(() => {
    return [
      ...researchers.map((p) => ({ ...p, type: p.type || "researcher" })),
      ...staff.map((p) => ({ ...p, type: p.type || "staff" })),
      ...students.map((p) => ({ ...p, type: p.type || "student" })),
      ...visiting.map((p) => ({ ...p, type: p.type || "visiting" })),
      ...external.map((p) => ({ ...p, type: p.type || "external" })),
      ...alumni.map((p) => ({ ...p, type: p.type || "alumni" })),
    ];
  }, [staff, researchers, visiting, students, external, alumni]);

  const filterOptions = useMemo(() => {
    const counts = {};
    allPeopleFlat.forEach((p) => {
      counts[p.type] = (counts[p.type] || 0) + 1;
    });

    return [
      { id: "all", label: "All", icon: null, count: allPeopleFlat.length },
      { id: "researcher", label: t("tabs.researchers"), ...getRoleConfig("researcher"), count: counts.researcher || 0 },
      { id: "staff", label: t("tabs.staff"), ...getRoleConfig("staff"), count: counts.staff || 0 },
      { id: "student", label: t("tabs.students"), ...getRoleConfig("student"), count: counts.student || 0 },
      { id: "visiting", label: t("tabs.visiting"), ...getRoleConfig("visiting"), count: counts.visiting || 0 },
      { id: "external", label: t("tabs.external"), ...getRoleConfig("external"), count: counts.external || 0 },
      { id: "alumni", label: t("tabs.alumni"), ...getRoleConfig("alumni"), count: counts.alumni || 0 },
    ].filter((option) => option.count > 0 || option.id === "all");
  }, [allPeopleFlat, t]);

  const displayedPeople = useMemo(() => {
    const terms = parseSearchTerms(searchQuery);

    let searchResults = allPeopleFlat;
    if (terms.length > 0) {
      searchResults = allPeopleFlat.filter((p) => {
        const searchable = normalizeSearchText([p.name, p.title, p.department, p.email].filter(Boolean).join(" "));
        return terms.every((term) => searchable.includes(term));
      });
    }

    let filtered = searchResults;
    if (activeFilter !== "all") {
      filtered = searchResults.filter((p) => p.type === activeFilter);
    }

    return [...filtered].sort((a, b) => {
      if (activeFilter === "researcher") {
        const countA = getCitationCount(a);
        const countB = getCitationCount(b);
        if (researcherSort === "most-citations" && countA !== countB) return countB - countA;
        if (researcherSort === "fewest-citations" && countA !== countB) return countA - countB;
      }

      return (a?.name || "").localeCompare(b?.name || "", "ro", {
        sensitivity: "base",
        numeric: true,
      });
    });
  }, [allPeopleFlat, activeFilter, searchQuery, researcherSort]);

  const handleFilterChange = (id) => {
    setActiveFilter(id);
    if (id !== "researcher") setResearcherSort("default");
  };

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="page-header-title">{t("title")}</h1>
          <p className="page-header-subtitle">{t("subtitle")}</p>
        </motion.div>

        <motion.div
          className="max-w-2xl mx-auto mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search all people by name, title, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-11 pr-10 text-center md:text-left"
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
          {searchQuery && (
            <p className="text-center text-xs text-muted mt-2">Searching across all {allPeopleFlat.length} people...</p>
          )}
        </motion.div>

        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-center mb-3">
            <span className="text-sm text-muted font-medium">Filter by role:</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {filterOptions.map((filter) => {
              const isActive = activeFilter === filter.id;
              const Icon = filter.icon;

              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterChange(filter.id)}
                  className={`
                    px-4 py-2 rounded-full font-medium text-sm transition-all duration-200
                    flex items-center gap-2
                    ${
                      isActive
                        ? `${filter.chipColor || "bg-primary-600"} text-white shadow-lg`
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                    }
                  `}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{filter.label}</span>
                  <span
                    className={`
                    text-xs px-1.5 py-0.5 rounded-full font-semibold
                    ${isActive ? "bg-white/25 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}
                  `}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <AnimatePresence>
          {activeFilter === "researcher" && (
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
                  {RESEARCHER_SORT_OPTIONS.map((opt) => (
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

        {(searchQuery || activeFilter !== "all") && (
          <motion.p className="text-center text-muted text-sm mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {searchQuery
              ? `Found ${displayedPeople.length} result${displayedPeople.length !== 1 ? "s" : ""} for "${searchQuery}"`
              : `Showing ${displayedPeople.length} ${
                  filterOptions.find((f) => f.id === activeFilter)?.label.toLowerCase() || "people"
                }`}
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {displayedPeople.length === 0 ? (
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
              <p className="text-lg">
                {searchQuery
                  ? `No people found matching "${searchQuery}"`
                  : `No ${filterOptions.find((f) => f.id === activeFilter)?.label.toLowerCase() || "people"} available yet.`}
              </p>
              {searchQuery && (
                <motion.button
                  onClick={() => setSearchQuery("")}
                  className="btn btn-secondary mt-4 inline-block"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear search
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`${activeFilter}-${researcherSort}-${searchQuery}`}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
            >
              {displayedPeople.map((person) => (
                <PersonCard
                  key={person.slug}
                  person={person}
                  basePath="/people"
                  showRoleBadge={true}
                  activeFilter={activeFilter}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
