"use client";

import { motion } from "framer-motion";

/* Animations */
const containerVariants = {
  hidden: { opacity: 0.9 },
  visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function ToolsClient() {
  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.h1
            variants={itemVariants}
            className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400"
          >
            Tools
          </motion.h1>

          {/* Content */}
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8"
          >
            <p className="text-base md:text-lg text-gray-900 dark:text-gray-100 font-medium">
              Here are the tools implemented at the AIRI institute.
            </p>
            <p className="mt-2 text-sm md:text-base text-gray-700 dark:text-gray-300">
              More updates coming soon.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
