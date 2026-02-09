"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Markdown from "markdown-to-jsx";
import { 
  FaDatabase, 
  FaGithub, 
  FaWrench, 
  FaCode, 
  FaFileAlt, 
  FaBook, 
  FaPlug, 
  FaCloud, 
  FaBrain, 
  FaLink,
  FaExternalLinkAlt,
  FaStar
} from "react-icons/fa";

/* Icon map based on schema enums */
const iconMap = {
  database: FaDatabase,
  github: FaGithub,
  tool: FaWrench,
  code: FaCode,
  document: FaFileAlt,
  book: FaBook,
  api: FaPlug,
  cloud: FaCloud,
  ai: FaBrain,
  link: FaLink,
};

/* Category labels for display */
const categoryLabels = {
  dataset: "Dataset",
  tool: "Tool",
  software: "Software",
  documentation: "Documentation",
  api: "API",
  library: "Library",
  framework: "Framework",
  learning: "Learning",
  other: "Other",
};

/* Category colors */
const categoryColors = {
  dataset: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  tool: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  software: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  documentation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  api: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  library: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  framework: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  learning: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
};

/* Animations */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      delayChildren: 0.1, 
      staggerChildren: 0.05 
    } 
  },
};

const itemVariants = { 
  hidden: { y: 20, opacity: 0 }, 
  visible: { y: 0, opacity: 1 } 
};

function ResourceCard({ resource }) {
  const IconComponent = iconMap[resource.icon] || FaLink;
  const categoryColor = categoryColors[resource.category] || categoryColors.other;
  const categoryLabel = categoryLabels[resource.category] || "Other";

  return (
    <motion.a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      variants={itemVariants}
      className="group relative flex flex-col h-full min-h-[320px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-7 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300"
    >
      {/* Featured badge */}
      {resource.featured && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 dark:bg-yellow-500 text-gray-900 rounded-full p-1.5 shadow-md z-10">
          <FaStar className="w-3 h-3" />
        </div>
      )}

      {/* Header with icon and category */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shadow-sm">
          <IconComponent className="w-7 h-7" />
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${categoryColor}`}>
          {categoryLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {resource.title}
      </h3>

      {/* Description */}
      <div className="mb-5 flex-grow text-gray-600 dark:text-gray-400 text-sm leading-relaxed prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-a:text-blue-600 hover:prose-a:underline">
        <Markdown options={{
          overrides: {
            a: {
              component: ({ children, ...props }) => (
                <a {...props} className="text-blue-600 dark:text-blue-400 font-medium hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
              ),
            },
          }
        }}>
          {resource.description || ""}
        </Markdown>
      </div>

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {resource.tags.slice(0, 5).map((tag, idx) => (
            <span 
              key={idx}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            >
              {tag}
            </span>
          ))}
          {resource.tags.length > 5 && (
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-700">
              +{resource.tags.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer with department and link indicator */}
      <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-800 mt-auto">
        {resource.department ? (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-500 truncate max-w-[65%]">
            {resource.department.name}
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
          Visit Resource <FaExternalLinkAlt className="w-3 h-3" />
        </span>
      </div>
    </motion.a>
  );
}

export default function ResourcesClient({ resources = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  /* Derive filter options from data */
  const filterOptions = useMemo(() => {
    const categories = new Set();

    for (const r of resources) {
      if (r.category) categories.add(r.category);
    }

    return {
      categories: Array.from(categories).sort(),
    };
  }, [resources]);

  /* Filter resources */
  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return resources.filter((r) => {
      const matchesSearch =
        !query ||
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        (r.tags || []).some(tag => tag.toLowerCase().includes(query));
      const matchesCategory = !categoryFilter || r.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [resources, searchQuery, categoryFilter]);

  /* Separate featured and regular resources */
  const { featuredResources, regularResources } = useMemo(() => {
    const featured = filteredResources.filter(r => r.featured);
    const regular = filteredResources.filter(r => !r.featured);
    return { featuredResources: featured, regularResources: regular };
  }, [filteredResources]);

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("");
  };

  const hasActiveFilters = searchQuery || categoryFilter;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-600 dark:text-yellow-400 mb-4">
            Resources
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explore our curated collection of tools, datasets, APIs, and learning materials 
            to support your AI research and development.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-10 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-base min-w-[180px]"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat] || cat}
                </option>
              ))}
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline px-2 whitespace-nowrap"
              >
                Clear filters
              </button>
            )}
          </div>
        </motion.div>

        {/* Results count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 text-sm text-gray-500 dark:text-gray-400 font-medium"
        >
          Showing {filteredResources.length} of {resources.length} resources
          {hasActiveFilters && " (filtered)"}
        </motion.div>

        {/* Featured Resources Section */}
        {featuredResources.length > 0 && (
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2.5">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
                <FaStar className="text-yellow-500 w-5 h-5" />
              </div>
              Featured Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredResources.map((resource) => (
                <ResourceCard key={resource.id || resource.slug} resource={resource} />
              ))}
            </div>
          </motion.section>
        )}

        {/* All Resources Grid */}
        {regularResources.length > 0 ? (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {featuredResources.length > 0 && (
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                All Resources
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularResources.map((resource) => (
                <ResourceCard key={resource.id || resource.slug} resource={resource} />
              ))}
            </div>
          </motion.section>
        ) : (
          filteredResources.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 border-dashed"
            >
              <div className="text-gray-400 dark:text-gray-600 mb-6 bg-gray-50 dark:bg-gray-900 w-24 h-24 rounded-full mx-auto flex items-center justify-center">
                <FaDatabase className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
                No resources found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {hasActiveFilters
                  ? "We couldn't find any resources matching your current filters. Try adjusting your search criteria."
                  : "Resources will appear here once they're added to the system."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )
        )}
      </div>
    </main>
  );
}
