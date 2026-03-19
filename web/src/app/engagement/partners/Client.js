"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0.2, staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function PartnersClient({ partners, CollaboratorsClient }) {
  const t = useTranslations("engagement.partners");

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <motion.div
        key="partners-container"
        className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-2xl md:text-3xl font-extrabold mb-8 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
          variants={itemVariants}
        >
          {t("title")}
        </motion.h1>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
        >
          {partners.map((p) => (
            <motion.a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800/70 transition block"
              variants={itemVariants}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{p.name}</h2>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{p.blurb}</p>
            </motion.a>
          ))}
        </motion.div>

        <motion.section className="mt-12" variants={itemVariants}>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {t("mapTitle")}
          </h2>
          <CollaboratorsClient partners={partners} />
        </motion.section>
      </motion.div>
    </div>
  );
}