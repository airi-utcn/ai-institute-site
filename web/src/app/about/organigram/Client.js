"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.12 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function Client() {
  const t = useTranslations("about.organigram");

  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <motion.div
        className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <section className="p-6 md:p-8">
          <motion.h1
            className="text-2xl md:text-3xl font-extrabold mb-6 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
            variants={item}
          >
            {t("title")}
          </motion.h1>

          <motion.p
            className="text-gray-700 dark:text-gray-300 mb-8 text-center"
            variants={item}
          >
            {t.rich("description", {
              strong: (chunks) => <strong>{chunks}</strong>
            })}
          </motion.p>

          <motion.div className="grid gap-6 md:grid-cols-2" variants={container}>
            <motion.section
              className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              variants={item}
            >
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("directorCommittee")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("viewDirectorStructure")}
                </p>
              </div>
              <div className="px-4 md:px-6 py-4">
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <a
                      href="/files/organigram-director.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("downloadPdf")}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/files/organigram-director.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("viewPng")}
                    </a>
                  </li>
                </ul>
              </div>
            </motion.section>

            <motion.section
              className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              variants={item}
            >
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("scientificCommittee")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("viewScientificStructure")}
                </p>
              </div>
              <div className="px-4 md:px-6 py-4">
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <a
                      href="/files/organigram-scientific.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("downloadPdf")}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/files/organigram-scientific.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("viewPng")}
                    </a>
                  </li>
                </ul>
              </div>
            </motion.section>
          </motion.div>
        </section>
      </motion.div>
    </main>
  );
}