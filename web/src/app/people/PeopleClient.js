"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTimes } from "react-icons/fa";
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

function PersonCard({ person, basePath = "/people" }) {
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
  groups = [] 
}) {
  const availableGroups = useMemo(
    () => (Array.isArray(groups) ? groups.filter((group) => Array.isArray(group?.people) && group.people.length) : []),
    [groups]
  );
  const [activeTab, setActiveTab] = useState(availableGroups[0]?.id || "");
  const [activeSubtab, setActiveSubtab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("people");

  const activeGroup = useMemo(
    () => availableGroups.find((group) => group.id === activeTab) || availableGroups[0] || null,
    [availableGroups, activeTab]
  );

  const subtabOptions = useMemo(
    () => (Array.isArray(activeGroup?.subtypes) ? activeGroup.subtypes.filter((subtype) => subtype.people?.length) : []),
    [activeGroup]
  );

  const selectedSubtabId = useMemo(() => {
    if (!subtabOptions.length) return "";
    if (activeSubtab && subtabOptions.some((subtype) => subtype.id === activeSubtab)) return activeSubtab;
    return "";
  }, [subtabOptions, activeSubtab]);

  const sourcePeople = useMemo(() => {
    if (!activeGroup) return [];
    if (!selectedSubtabId) return activeGroup.people || [];
    const selectedSubtype = subtabOptions.find((subtype) => subtype.id === selectedSubtabId);
    return selectedSubtype?.people || [];
  }, [activeGroup, subtabOptions, selectedSubtabId]);

  const currentPeople = useMemo(() => {
    const list = sourcePeople || [];
    const terms = parseSearchTerms(searchQuery);
    
    const filtered = terms.length
      ? list.filter((p) => {
          const searchable = normalizeSearchText(
            [p.name, p.title, p.department, p.email].filter(Boolean).join(" ")
          );

          return terms.every((term) => searchable.includes(term));
        })
      : list;

    return [...filtered].sort((a, b) =>
      (a?.name || "").localeCompare(b?.name || "", "ro", {
        sensitivity: "base",
        numeric: true,
      })
    );
  }, [sourcePeople, searchQuery]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        availableGroups.map((group) => [group.id, Array.isArray(group.people) ? group.people.length : 0])
      ),
    [availableGroups]
  );

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

        {/* Search Bar */}
        <motion.div 
          className="max-w-md mx-auto mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-11 pr-10"
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
        </motion.div>

        {/* Tabs */}
        <motion.div 
          className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {availableGroups.map((tab) => {
            const isActive = activeGroup?.id === tab.id;
            const count = counts[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveSubtab("");
                }}
                className={`
                  px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                  flex items-center gap-2
                  ${isActive 
                    ? "bg-primary-600 text-white shadow-md dark:bg-accent-500" 
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }
                `}
              >
                <span>{tab.label}</span>
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isActive 
                    ? "bg-white/20 text-white" 
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }
                `}>
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {subtabOptions.length > 0 && (
          <motion.div
            className="flex flex-wrap justify-center gap-2 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={() => setActiveSubtab("")}
              className={`
                px-3 py-2 rounded-lg font-medium text-xs transition-all duration-200 border
                ${!selectedSubtabId
                  ? "bg-primary-600 text-white border-primary-600 dark:bg-accent-500 dark:border-accent-500"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }
              `}
            >
              {t("subtabs.all")}
            </button>
            {subtabOptions.map((subtab) => {
              const isActiveSubtab = selectedSubtabId === subtab.id;
              const subtypeCount = Array.isArray(subtab.people) ? subtab.people.length : 0;
              return (
                <button
                  key={subtab.id}
                  onClick={() => setActiveSubtab(subtab.id)}
                  className={`
                    px-3 py-2 rounded-lg font-medium text-xs transition-all duration-200 border flex items-center gap-2
                    ${isActiveSubtab
                      ? "bg-primary-600 text-white border-primary-600 dark:bg-accent-500 dark:border-accent-500"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                    }
                  `}
                >
                  <span>{subtab.label}</span>
                  <span
                    className={`
                      text-[10px] px-1.5 py-0.5 rounded-full
                      ${isActiveSubtab ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}
                    `}
                  >
                    {subtypeCount}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}

        {(activeGroup?.description || (selectedSubtabId && subtabOptions.find((sub) => sub.id === selectedSubtabId)?.description)) && (
          <motion.p
            className="text-center text-muted text-sm mb-6 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {selectedSubtabId
              ? subtabOptions.find((sub) => sub.id === selectedSubtabId)?.description
              : activeGroup?.description}
          </motion.p>
        )}

        {/* Results info */}
        {searchQuery && (
          <motion.p 
            className="text-center text-muted text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {currentPeople.length === 1 
              ? t("results", { count: currentPeople.length, query: searchQuery }) 
              : t("resultsPlural", { count: currentPeople.length, query: searchQuery })
            }
          </motion.p>
        )}

        {/* People Grid */}
        <AnimatePresence mode="wait">
          {currentPeople.length === 0 ? (
            <motion.div
              key="empty"
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-lg">
                {searchQuery 
                  ? t("emptySearch") 
                  : t("emptyTab", { tabName: (activeGroup?.label || "").toLowerCase() })
                }
              </p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="btn btn-secondary mt-4"
                >
                  {t("clearSearch")}
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
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
