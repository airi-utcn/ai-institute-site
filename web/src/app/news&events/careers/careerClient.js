"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/* Animations */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 },},
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export default function CareerClient() {
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      <motion.h1
        className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        Career Opportunities
      </motion.h1>

      <motion.p
        className="text-gray-800 dark:text-gray-200 text-center max-w-3xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        Explore ways to work with AIRI across study levels and roles.
      </motion.p>

      <motion.div
        className="mt-10 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* UNDERGRADUATE */}
        <motion.section variants={itemVariants} className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            As an Undergraduate Student
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            More information coming soon.
          </p>
        </motion.section>

        {/* POST-GRADUATE */}
        <motion.section variants={itemVariants} className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            As a Post-Graduate Student
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            More information coming soon.
          </p>
        </motion.section>

        {/* POSTDOCTORAL */}
        <motion.section variants={itemVariants} className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            As a Postdoctoral Researcher
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            More information coming soon.
          </p>
        </motion.section>

        {/* VISITING RESEARCHER */}
        <motion.section variants={itemVariants} className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            As a Visiting Researcher
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            More information coming soon.
          </p>
        </motion.section>

        {/* SOFTWARE ENGINEER */}
        <motion.section variants={itemVariants} className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            As a Software Engineer
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            More information coming soon.
          </p>
        </motion.section>

        {/* Anchor target for the top button */}
        <motion.section id="open-positions" variants={itemVariants}>
          <div className="mt-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center text-gray-600 dark:text-gray-400 bg-white/40 dark:bg-gray-900/40">
            More updates on this section coming soon.
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
