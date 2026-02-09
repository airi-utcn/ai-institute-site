"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FaFlask, FaBook, FaArrowRight } from "react-icons/fa";
import { containerVariants, itemVariants } from "@/lib/animations";

// Default colors for themes without a specified color
const DEFAULT_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#EF4444", // red
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#6366F1", // indigo
];

export default function ThemesClient({ themes = [] }) {
  const [hoveredTheme, setHoveredTheme] = useState(null);

  const normalizedThemes = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(themes) ? themes : [];

    list.forEach((theme, index) => {
      const name = String(theme?.name || "").trim();
      if (!name) return;

      const slug = String(theme?.slug || "").trim();
      const summary = typeof theme?.summary === "string" ? theme.summary.trim() : "";
      const color = typeof theme?.color === "string" && theme.color.trim() 
        ? theme.color.trim() 
        : DEFAULT_COLORS[index % DEFAULT_COLORS.length];
      const key = slug || name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, { name, slug, summary, color });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [themes]);

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="page-header">
            <h1 className="page-header-title">Research Themes</h1>
            <p className="page-header-subtitle">
              Explore our key research areas and discover related projects and publications.
            </p>
          </motion.div>

          {normalizedThemes.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {normalizedThemes.map(({ name, slug, summary, color }) => (
                <motion.div
                  key={slug || name}
                  variants={itemVariants}
                  className="card card-hover overflow-hidden group"
                  onMouseEnter={() => setHoveredTheme(slug || name)}
                  onMouseLeave={() => setHoveredTheme(null)}
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <div className="p-6">
                    {/* Theme header with color indicator */}
                    <div className="flex items-start gap-4 mb-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <FaFlask style={{ color }} className="text-xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors">
                          {name}
                        </h2>
                      </div>
                    </div>

                    {/* Summary */}
                    {summary && (
                      <p className="text-muted text-sm mb-6 line-clamp-3">
                        {summary}
                      </p>
                    )}

                    {/* Action links */}
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/research/projects?theme=${encodeURIComponent(name)}`}
                        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-100 hover:text-primary-700 dark:hover:bg-gray-700 dark:hover:text-accent-400 transition-all"
                      >
                        <FaFlask className="text-xs" />
                        View Projects
                        <FaArrowRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <Link
                        href={`/research/publications?theme=${encodeURIComponent(name)}`}
                        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-100 hover:text-primary-700 dark:hover:bg-gray-700 dark:hover:text-accent-400 transition-all"
                      >
                        <FaBook className="text-xs" />
                        View Publications
                        <FaArrowRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </div>
                  </div>

                  {/* Hover indicator bar */}
                  <motion.div 
                    className="h-1 w-full"
                    style={{ backgroundColor: color }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: hoveredTheme === (slug || name) ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No themes found.</p>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
