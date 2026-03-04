"use client";

import { motion } from "framer-motion";

/* Animations */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 },},
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function OpenProjectsCallsClient() {
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      <motion.h1
        className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        Calls for Projects
      </motion.h1>

      <motion.p
        className="text-gray-800 dark:text-gray-200 text-center max-w-3xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        Calls for proposals and collaboration opportunities.
      </motion.p>

      {/* Placeholder state */}
      <motion.div
        className="mt-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={itemVariants}
          className="text-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-white dark:bg-gray-900"
        >
          More updates on this section coming soon.
        </motion.p>
      </motion.div>
    </div>
  );
}
