"use client";

import { motion } from "framer-motion";

/**
 * Reusable page header component for consistent styling across pages.
 * 
 * @param {string} title - The main page title
 * @param {string} subtitle - Optional subtitle/description
 * @param {boolean} animate - Whether to animate the header (default: true)
 * @param {string} className - Additional CSS classes
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  animate = true,
  className = "" 
}) {
  const headerContent = (
    <>
      <h1 className="page-header-title">{title}</h1>
      {subtitle && (
        <p className="page-header-subtitle">{subtitle}</p>
      )}
    </>
  );

  if (!animate) {
    return (
      <header className={`page-header ${className}`}>
        {headerContent}
      </header>
    );
  }

  return (
    <motion.header 
      className={`page-header ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1 
        className="page-header-title"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p 
          className="page-header-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.header>
  );
}
