"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0.2, staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { y: 18, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function HighSchoolClient() {
  const Feature = ({ title, desc }) => (
    <motion.div
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800/70 transition"
      variants={itemVariants}
    >
      <div className="flex items-start gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{desc}</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <motion.div
        key="high-school-container" 
        className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <section className="p-6 md:p-8">
          <motion.h1
            className="text-2xl md:text-3xl font-extrabold mb-3 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
            variants={itemVariants}
          >
            AI in High Schools
          </motion.h1>

          <motion.p
            className="text-center text-sm md:text-base text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-8"
            variants={itemVariants}
          >
            Programs, competitions, and learning paths designed to inspire the next generation of AI innovators.
          </motion.p>

          <motion.div className="grid gap-4 md:grid-cols-3" variants={containerVariants}>
            <Feature
              title="Competitions & Hackathons" 
              desc="Challenges and team projects for high-school students to experiment with real-world AI." 
            />
            <Feature
              title="Workshops & Visits" 
              desc="Interactive sessions and lab tours to discover cutting-edge artificial intelligence." 
            />
            <Feature
              title="Educational Materials" 
              desc="Open-access tutorials, code notebooks, and intro materials for teachers and students." 
            />
          </motion.div>

          <motion.div className="mt-8 text-center" variants={itemVariants}>
            <a
              href="https://ailiteracyframework.org/wp-content/uploads/2025/05/AILitFramework_ReviewDraft.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              Read AI Literacy Framework (PDF)
            </a>
          </motion.div>
        </section>
      </motion.div>
    </div>
  );
}
