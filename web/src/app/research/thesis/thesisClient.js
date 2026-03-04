"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/* Animations */
const containerVariants = {
  hidden: { opacity: 0.9 }, visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function ThesisClient() {
  const [selected, setSelected] = useState("phd");

  const sections = {
    phd: { 
      title: "PhD", 
      message: "More updates coming soon for the PhD section." 
    },
    master: { 
      title: "Master", 
      message: "More updates coming soon for the Master section." 
    },
    bachelor: { 
      title: "Bachelor", 
      message: "More updates coming soon for the Bachelor section." 
    },
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.h1
            variants={itemVariants}
            className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400 text-center"
          >
            Thesis
          </motion.h1>

          <div className="mb-6 flex justify-center md:justify-start">
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {Object.keys(sections).map((key) => {
                const active = selected === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    aria-pressed={active}
                    className={`px-4 py-2 text-sm font-medium focus:outline-none transition
                      ${active
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"}
                    `}
                  >
                    {sections[key].title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <motion.div
            key={selected}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {sections[selected].title}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {sections[selected].message}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
