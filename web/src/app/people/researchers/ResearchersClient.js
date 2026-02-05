"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import PageHeader from "@/components/PageHeader";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function ResearchersClient({ staffData = [] }) {
  const researchers = Array.isArray(staffData) ? staffData : [];

  const researchersSorted = useMemo(
    () =>
      [...researchers].sort((a, b) =>
        (a?.name || "").localeCompare(b?.name || "", "ro", {
          sensitivity: "base",
          numeric: true,
        })
      ),
    [researchers]
  );

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <PageHeader
          title="Researchers"
          subtitle="This section lists our researchers involved in research activities."
        />

        {researchersSorted.length === 0 ? (
          <div className="empty-state">
            <p>No researchers available yet.</p>
          </div>
        ) : (
          <motion.div
            className="grid-cards"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {researchersSorted.map((person) => (
              <motion.article
                key={person.slug}
                className="card card-hover p-5"
                variants={itemVariants}
              >
                <Link href={`/people/${encodeURIComponent(person.slug)}`} className="block text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <img
                      src={person.image || "/people/Basic_avatar_image.png"}
                      alt={person.name}
                      width={128}
                      height={128}
                      loading="lazy"
                      className="w-full h-full rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                    />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{person.name}</h2>
                  {person.title && (
                    <p className="text-sm text-muted mt-1">{person.title}</p>
                  )}
                  {person.email && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">{person.email}</p>
                  )}
                </Link>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}