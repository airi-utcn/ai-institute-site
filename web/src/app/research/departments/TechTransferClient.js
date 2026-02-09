"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.12 } },
};
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export const techTransferPage = Client();

export default function Client() {
  return (
    <div>
      <motion.div
        className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <section>
          <motion.p
            className="text-gray-700 dark:text-gray-300 mb-6"
            variants={itemVariants}
          >
            We support technology transfer: IP identification, licensing, prototyping, and spin-offs.
          </motion.p>

          <motion.div
            className="mt-2 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            variants={itemVariants}
          >
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Services
              </h2>
            </div>
            <div className="px-4 md:px-6 py-6">
              <motion.ul
                className="list-disc pl-6 space-y-1 text-sm text-gray-700 dark:text-gray-300"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.li variants={itemVariants}>TRL assessment & roadmap</motion.li>
                <motion.li variants={itemVariants}>Rapid prototyping</motion.li>
                <motion.li variants={itemVariants}>Industry matchmaking</motion.li>
              </motion.ul>
            </div>
          </motion.div>
        </section>
      </motion.div>
    </div>
  );
}
