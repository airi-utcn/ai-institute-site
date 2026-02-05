"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";

export default function AlumniClient({ staffData = [] }) {
  const people = Array.isArray(staffData) ? staffData : [];

  const sorted = useMemo(
    () =>
      [...people].sort((a, b) =>
        (a?.name || "").localeCompare(b?.name || "", "ro", {
          sensitivity: "base",
          numeric: true,
        })
      ),
    [people]
  );

  return (
    <main className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      <motion.h1
        className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        Alumni
      </motion.h1>

      <motion.p
        className="text-gray-800 dark:text-gray-200 text-center max-w-3xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        Our alumni community grows as projects complete and colleagues move to new challenges.
      </motion.p>

      {sorted.length === 0 ? (
        <motion.p
          className="mt-10 text-center text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
        >
          No alumni listed yet.
        </motion.p>
      ) : (
        <motion.div
          className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.08, delayChildren: 0.15 },
            },
          }}
        >
          {sorted.map((person) => (
            <motion.article
              key={person.slug}
              className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow"
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <Link href={`/people/${encodeURIComponent(person.slug)}`} className="block text-center">
                <div className="relative w-36 h-36 mx-auto">
                  {(() => {
                    const imageSrc = person.image || "/people/Basic_avatar_image.png";
                    return (
                      <img
                        src={imageSrc}
                        alt={person.name}
                        width={144}
                        height={144}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full rounded-full object-cover"
                      />
                    );
                  })()}
                </div>
                <h2 className="mt-4 text-lg font-semibold">{person.name}</h2>
                {person.title && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{person.title}</p>
                )}
                {person.email && <p className="text-sm mt-1">{person.email}</p>}
                {person.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {person.phone}</p>
                )}
              </Link>
            </motion.article>
          ))}
        </motion.div>
      )}
    </main>
  );
}
