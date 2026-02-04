"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTimes } from "react-icons/fa";

const TABS = [
  { id: "researchers", label: "Researchers", icon: "🔬" },
  { id: "staff", label: "Staff", icon: "👥" },
  { id: "visiting", label: "Visiting Researchers", icon: "🌍" },
  { id: "alumni", label: "Alumni", icon: "🎓" },
];

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

function PersonCard({ person, basePath = "/people/staff" }) {
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
  staff = [], 
  researchers = [], 
  visiting = [], 
  alumni = [] 
}) {
  const [activeTab, setActiveTab] = useState("researchers");
  const [searchQuery, setSearchQuery] = useState("");

  const allPeople = useMemo(() => ({
    researchers: Array.isArray(researchers) ? researchers : [],
    staff: Array.isArray(staff) ? staff : [],
    visiting: Array.isArray(visiting) ? visiting : [],
    alumni: Array.isArray(alumni) ? alumni : [],
  }), [staff, researchers, visiting, alumni]);

  const currentPeople = useMemo(() => {
    const list = allPeople[activeTab] || [];
    const query = searchQuery.toLowerCase().trim();
    
    const filtered = query
      ? list.filter((p) => {
          const searchable = [
            p.name,
            p.title,
            p.department,
            p.email,
          ].filter(Boolean).join(" ").toLowerCase();
          return searchable.includes(query);
        })
      : list;

    return [...filtered].sort((a, b) =>
      (a?.name || "").localeCompare(b?.name || "", "ro", {
        sensitivity: "base",
        numeric: true,
      })
    );
  }, [allPeople, activeTab, searchQuery]);

  const counts = useMemo(() => ({
    researchers: allPeople.researchers.length,
    staff: allPeople.staff.length,
    visiting: allPeople.visiting.length,
    alumni: allPeople.alumni.length,
  }), [allPeople]);

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        {/* Header */}
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="page-header-title">People</h1>
          <p className="page-header-subtitle">
            Meet the team behind AIRi @ UTCN
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
              placeholder="Search by name, title, or department..."
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
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                  flex items-center gap-2
                  ${isActive 
                    ? "bg-primary-600 text-white shadow-md dark:bg-accent-500" 
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }
                `}
              >
                <span>{tab.icon}</span>
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

        {/* Results info */}
        {searchQuery && (
          <motion.p 
            className="text-center text-muted text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Found {currentPeople.length} result{currentPeople.length !== 1 ? "s" : ""} 
            {" "}for &ldquo;{searchQuery}&rdquo;
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
                  ? "No people match your search." 
                  : `No ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()} available yet.`
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
                  basePath="/people/staff"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
