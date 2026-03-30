"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTimes, FaFlask, FaUserTie, FaGraduationCap, FaGlobe, FaHandshake, FaTrophy } from "react-icons/fa";
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

// Get role configuration for a person type
const getRoleConfig = (type) => {
  const configs = {
    researcher: { 
      label: "Researcher", 
      icon: FaFlask, 
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      chipColor: "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
    },
    staff: { 
      label: "Staff", 
      icon: FaUserTie, 
      color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
      chipColor: "bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
    },
    student: { 
      label: "Student", 
      icon: FaGraduationCap, 
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      chipColor: "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
    },
    visiting: { 
      label: "Visiting", 
      icon: FaGlobe, 
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      chipColor: "bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700"
    },
    visiting_researcher: { 
      label: "Visiting", 
      icon: FaGlobe, 
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      chipColor: "bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700"
    },
    external: { 
      label: "External", 
      icon: FaHandshake, 
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      chipColor: "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
    },
    alumni: { 
      label: "Alumni", 
      icon: FaTrophy, 
      color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
      chipColor: "bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
    },
  };
  
  return configs[type] || configs.researcher;
};

// Format subtype labels for display
const formatSubtypeLabel = (subtype) => {
  if (!subtype) return null;
  
  // Smart formatting: convert snake_case/camelCase to Title Case
  const formatted = subtype
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return formatted;
};

function PersonCard({ person, basePath = "/people", showRoleBadge = false, activeFilter = "all" }) {
  const subtypeLabel = formatSubtypeLabel(person.subtype);
  const roleConfig = getRoleConfig(person.type);
  const RoleIcon = roleConfig.icon;
  
  // Determine what to show in the badge
  const getBadgeLabel = () => {
    // When viewing "All": show both type and subtype with bullet
    if (activeFilter === "all") {
      if (subtypeLabel) {
        return `${roleConfig.label} • ${subtypeLabel}`;
      }
      return roleConfig.label;
    }
    
    // When filtered by specific type: show only subtype (if exists)
    if (subtypeLabel) {
      return subtypeLabel;
    }
    
    // Fallback to main type
    return roleConfig.label;
  };
  
  return (
    <motion.article
      className="card card-hover p-5"
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
        
        <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
          {person.name}
        </h2>
        
        {/* Role badge - shown when filtering by "All" or during search */}
        {showRoleBadge && (
          <div className="flex items-center justify-center gap-1 mt-2 px-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${roleConfig.color}`}>
              <RoleIcon className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="whitespace-nowrap">{getBadgeLabel()}</span>
            </span>
          </div>
        )}
        
        {person.title && (
          <p className="text-xs text-muted mt-1 line-clamp-2">{person.title}</p>
        )}
        {person.department && (
          <p className="text-xs text-primary-600 dark:text-accent-400 mt-1">{person.department}</p>
        )}
      </Link>
    </motion.article>
  );
}

export default function PeopleClient({ 
  staff = [], 
  researchers = [], 
  visiting = [], 
  students = [],
  external = [],
  alumni = [] 
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // Placeholder for Google Scholar sorting
  const t = useTranslations("people");

  // Combine all people into one flat list with their type
  const allPeopleFlat = useMemo(() => {
    const combined = [
      ...researchers.map(p => ({ ...p, type: p.type || 'researcher' })),
      ...staff.map(p => ({ ...p, type: p.type || 'staff' })),
      ...students.map(p => ({ ...p, type: p.type || 'student' })),
      ...visiting.map(p => ({ ...p, type: p.type || 'visiting' })),
      ...external.map(p => ({ ...p, type: p.type || 'external' })),
      ...alumni.map(p => ({ ...p, type: p.type || 'alumni' })),
    ];
    return combined;
  }, [staff, researchers, visiting, students, external, alumni]);

  // Filter options with counts
  const filterOptions = useMemo(() => {
    const counts = {};
    allPeopleFlat.forEach(p => {
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
    ].filter(option => option.count > 0 || option.id === "all");
  }, [allPeopleFlat, t]);

  // Search and filter logic - IMPORTANT: Search works on ALL people, not just filtered
  const displayedPeople = useMemo(() => {
    const terms = parseSearchTerms(searchQuery);
    
    // Step 1: Apply search across ALL people (if searching)
    let searchResults = allPeopleFlat;
    if (terms.length > 0) {
      searchResults = allPeopleFlat.filter((p) => {
        const searchable = normalizeSearchText(
          [p.name, p.title, p.department, p.email].filter(Boolean).join(" ")
        );
        return terms.every((term) => searchable.includes(term));
      });
    }
    
    // Step 2: Apply type filter (if not "all")
    let filtered = searchResults;
    if (activeFilter !== "all") {
      filtered = searchResults.filter(p => p.type === activeFilter);
    }
    
    // Step 3: Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return (a?.name || "").localeCompare(b?.name || "", "ro", {
          sensitivity: "base",
          numeric: true,
        });
      }
      // Add Google Scholar sorting here when PR comes in
      return 0;
    });
    
    return sorted;
  }, [allPeopleFlat, activeFilter, searchQuery, sortBy]);

  // Determine if we should show role badges (when viewing "all" or searching)
  const showRoleBadges = activeFilter === "all" || searchQuery.length > 0;

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        {/* Header */}
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="page-header-title">{t("title")}</h1>
          <p className="page-header-subtitle">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Search Bar - Searches ALL people */}
        <motion.div 
          className="max-w-2xl mx-auto mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Search all people by name, title, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-11 pr-10 text-center md:text-left"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-center text-xs text-muted mt-2">
              Searching across all {allPeopleFlat.length} people...
            </p>
          )}
        </motion.div>

        {/* Sort Controls (placeholder for Google Scholar) */}
        <motion.div 
          className="max-w-2xl mx-auto mb-6 flex items-center justify-center gap-3 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <span className="text-muted">Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="name">Name (A-Z)</option>
            <option value="scholar" disabled>Google Scholar Citations (coming soon)</option>
          </select>
        </motion.div>

        {/* Filter Chips */}
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
                  onClick={() => setActiveFilter(filter.id)}
                  className={`
                    px-4 py-2 rounded-full font-medium text-sm transition-all duration-200
                    flex items-center gap-2
                    ${isActive 
                      ? `${filter.chipColor || "bg-primary-600"} text-white shadow-lg` 
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                    }
                  `}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{filter.label}</span>
                  <span className={`
                    text-xs px-1.5 py-0.5 rounded-full font-semibold
                    ${isActive 
                      ? "bg-white/25 text-white" 
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }
                  `}>
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Results info */}
        {(searchQuery || activeFilter !== "all") && (
          <motion.p 
            className="text-center text-muted text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {searchQuery 
              ? `Found ${displayedPeople.length} result${displayedPeople.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `Showing ${displayedPeople.length} ${filterOptions.find(f => f.id === activeFilter)?.label.toLowerCase() || 'people'}`
            }
          </motion.p>
        )}

        {/* People Grid */}
        <AnimatePresence mode="wait">
          {displayedPeople.length === 0 ? (
            <motion.div
              key="empty"
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-lg">
                {searchQuery 
                  ? `No people found matching "${searchQuery}"` 
                  : `No ${filterOptions.find(f => f.id === activeFilter)?.label.toLowerCase() || 'people'} available yet.`
                }
              </p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="btn btn-secondary mt-4"
                >
                  Clear search
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`${activeFilter}-${searchQuery}`}
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
                  showRoleBadge={showRoleBadges}
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