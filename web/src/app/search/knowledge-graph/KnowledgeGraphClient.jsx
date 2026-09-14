"use client";

import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function KnowledgeGraphClient({ searchData }) {
  const title = searchData?.kgTitle || "Knowledge Graphs";
  const cardTitle = searchData?.kgCardTitle || "Interactive Research Explorer";
  const comingSoon = searchData?.kgComingSoon || "Coming soon. An interactive graph visualization of AIRi publications, projects, and researcher connections.";

  return (
    <motion.div variants={container} initial="hidden" animate="visible">
      <motion.h1
        className="text-2xl md:text-3xl font-extrabold mb-6 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
        variants={item}
      >
        {title}
      </motion.h1>

      <motion.div
        className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white/80 dark:bg-slate-900/70 backdrop-blur"
        variants={item}
      >
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
          {cardTitle}
        </h2>
        <p className="text-slate-700 dark:text-slate-300">
          {comingSoon}
        </p>
      </motion.div>
    </motion.div>
  );
}
