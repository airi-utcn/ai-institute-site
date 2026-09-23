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

const normalizeSortName = (name) =>
  (name || "")
    .toString()
    .replace(/\s+/g, " ")
    .trim();

const getPersonKey = (person) => {
  if (!person) return "";
  if (person.id !== undefined && person.id !== null) return `id:${person.id}`;
  if (person.slug) return `slug:${person.slug}`;
  if (person.email) return `email:${normalizeSearchText(person.email)}`;
  if (person.name) return `name:${normalizeSearchText(person.name)}:${person.type || "unknown"}`;
  return "";
};

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
      label: "Researchers",
      icon: FaFlask,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      chipColor: "bg-blue-600 hover:bg-blue-700",
    },
    staff: {
      label: "Staff",
      icon: FaUserTie,
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      chipColor: "bg-purple-600 hover:bg-purple-700",
    },
    student: {
      label: "Students",
      icon: FaGraduationCap,
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      chipColor: "bg-amber-600 hover:bg-amber-700",
    },
    visiting: {
      label: "Visiting",
      icon: FaGlobe,
      color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      chipColor: "bg-teal-600 hover:bg-teal-700",
    },
    external: {
      label: "External",
      icon: FaHandshake,
      color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      chipColor: "bg-rose-600 hover:bg-rose-700",
    },
    alumni: {
      label: "Alumni",
      icon: FaTrophy,
      color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      chipColor: "bg-indigo-600 hover:bg-indigo-700",
    },
  };
  return configs[type] || configs.staff;
};

const RESEARCHER_SORT_OPTIONS = [
  { value: "most-citations", label: "Citations: High to Low" },
  { value: "least-citations", label: "Citations: Low to High" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

function PersonCard({ person, basePath = "/people", showRoleBadge = true, activeFilter = "all" }) {
  const roleConfig = getRoleConfig(person.type);
  const initials = (person.name || "?")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const citationCount = getCitationCount(person);
  const showCitationBadge = person.type === "researcher" && activeFilter !== "staff" && activeFilter !== "student";

  return (
    <motion.div
      variants={itemVariants}
      className="card card-hover flex flex-col items-center text-center p-4 relative group"
    >
      {showRoleBadge && (
        <span
          className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleConfig.color}`}
        >
          {roleConfig.label}
        </span>
      )}

      {showCitationBadge && (
        <span
          className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
          title={`${citationCount} Google Scholar citation${citationCount !== 1 ? "s" : ""}`}
        >
          {citationCount.toLocaleString()} {citationCount === 1 ? "cit." : "cits."}
        </span>
      )}

      <Link href={`${basePath}/${encodeURIComponent(person.slug)}`} className="block text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-accent-500 flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-105 transition-transform">
          {person.image ? (
            <img
              src={person.image}
              alt={person.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <h3 className="heading-3 text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors">
          {person.name}
        </h3>

        {person.title && (
          <p className="text-xs text-muted line-clamp-1 mt-0.5">
            {person.title}
          </p>
        )}

        {person.department && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
            {person.department.name}
          </p>
        )}
      </Link>
    </motion.div>
  );
}

const SORT_OPTIONS = RESEARCHER_SORT_OPTIONS;

export default function PeopleClient({
  staff = [],
  researchers = [],
  visiting = [],
  students = [],
  external = [],
  alumni = [],
  pageData,
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allSort, setAllSort] = useState("most-citations");
  const [researcherSort, setResearcherSort] = useState("most-citations");

  const title = pageData?.title || "People";
  const subtitle = pageData?.subtitle || "Meet the researchers, faculty, and collaborative teams shaping AI innovation at AIRi.";
  const tabResearchers = pageData?.tabResearchers || "Researchers";
  const tabStaff = pageData?.tabStaff || "Staff";
  const tabStudents = pageData?.tabStudents || "Students";
  const tabVisiting = pageData?.tabVisiting || "Visiting Scholars";
  const tabExternal = pageData?.tabExternal || "External Collaborators";
  const tabAlumni = pageData?.tabAlumni || "Alumni";

  const allPeopleFlat = useMemo(() => {
    const merged = [
      ...researchers.map((p) => ({ ...p, type: p.type || "researcher" })),
      ...staff.map((p) => ({ ...p, type: p.type || "staff" })),
      ...students.map((p) => ({ ...p, type: p.type || "student" })),
      ...visiting.map((p) => ({ ...p, type: p.type || "visiting" })),
      ...external.map((p) => ({ ...p, type: p.type || "external" })),
      ...alumni.map((p) => ({ ...p, type: p.type || "alumni" })),
    ];

    const seen = new Set();
    return merged.filter((person) => {
      const key = getPersonKey(person);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [staff, researchers, visiting, students, external, alumni]);

  const filterOptions = useMemo(() => {
    const counts = {};
    allPeopleFlat.forEach((p) => {
      counts[p.type] = (counts[p.type] || 0) + 1;
    });

    return [
      { id: "all", label: "All", icon: null, count: allPeopleFlat.length },
      { id: "researcher", label: tabResearchers, ...getRoleConfig("researcher"), count: counts.researcher || 0 },
      { id: "staff", label: tabStaff, ...getRoleConfig("staff"), count: counts.staff || 0 },
      { id: "student", label: tabStudents, ...getRoleConfig("student"), count: counts.student || 0 },
      { id: "visiting", label: tabVisiting, ...getRoleConfig("visiting"), count: counts.visiting || 0 },
      { id: "external", label: tabExternal, ...getRoleConfig("external"), count: counts.external || 0 },
      { id: "alumni", label: tabAlumni, ...getRoleConfig("alumni"), count: counts.alumni || 0 },
    ].filter((option) => option.count > 0 || option.id === "all");
  }, [allPeopleFlat, tabResearchers, tabStaff, tabStudents, tabVisiting, tabExternal, tabAlumni]);

  const displayedPeople = useMemo(() => {
    const terms = parseSearchTerms(searchQuery);
    const currentSort = activeFilter === "researcher" ? researcherSort : allSort;

    let searchResults = allPeopleFlat;
    if (terms.length > 0) {
      searchResults = allPeopleFlat.filter((p) => {
        const searchable = normalizeSearchText(
          [p.name, p.title, p.email, p.department?.name, p.type].filter(Boolean).join(" ")
        );
        return terms.every((term) => searchable.includes(term));
      });
    }

    const filtered = activeFilter === "all"
      ? searchResults
      : searchResults.filter((p) => p.type === activeFilter);

    return [...filtered].sort((a, b) => {
      if (currentSort === "most-citations") {
        const countA = getCitationCount(a);
        const countB = getCitationCount(b);
        if (countB !== countA) return countB - countA;
      }
      if (currentSort === "least-citations") {
        const countA = getCitationCount(a);
        const countB = getCitationCount(b);
        if (countA !== countB) return countA - countB;
      }
      if (currentSort === "name-asc") {
        return normalizeSortName(a.name).localeCompare(normalizeSortName(b.name));
      }
      if (currentSort === "name-desc") {
        return normalizeSortName(b.name).localeCompare(normalizeSortName(a.name));
      }
      return 0;
    });
  }, [allPeopleFlat, activeFilter, searchQuery, allSort, researcherSort]);

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  const currentSort = activeFilter === "researcher" ? researcherSort : allSort;
  const setCurrentSort = activeFilter === "researcher" ? setResearcherSort : setAllSort;

  return (
    <div className="page-container py-12">
      <div className="content-wrapper content-padding">
        <motion.div
          className="page-header text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-subtitle">{subtitle}</p>
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
          {(activeFilter === "all" || activeFilter === "researcher") && (
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
                  value={currentSort}
                  onChange={(e) => setCurrentSort(e.target.value)}
                  className="input pl-10 pr-10 appearance-none cursor-pointer bg-white dark:bg-gray-800 w-full"
                  aria-label={activeFilter === "researcher" ? "Sort researchers by citations" : "Sort people"}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center py-16">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery
                    ? `No people found matching "${searchQuery}"`
                    : `No ${filterOptions.find((f) => f.id === activeFilter)?.label.toLowerCase() || "people"} available.`}
                </p>
                {(searchQuery || activeFilter !== "all") && (
                  <button
                    onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
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
                  key={getPersonKey(person)}
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
