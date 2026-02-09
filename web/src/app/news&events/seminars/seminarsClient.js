"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

/* Animations */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 },},
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function Chevron({ open }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.18l3.71-2.95a.75.75 0 11.94 1.16l-4.24 3.37a.75.75 0 01-.94 0L5.21 8.39a.75.75 0 01.02-1.18z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SectionToggle({ label, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 text-sm font-medium transition hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <span>{label}</span>
        <Chevron open={open} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SeminarsClient({ seminars = [] }) {
  const items = Array.isArray(seminars) ? seminars : [];

  return (
    <main className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      <motion.h1
        className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        Seminars
      </motion.h1>

      <motion.p
        className="text-gray-800 dark:text-gray-200 text-center max-w-3xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        Academic seminars hosted by AIRI and guests.
      </motion.p>

      {items.length === 0 ? (
        <motion.p
          className="mt-10 text-center text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
        >
          No seminars available at the moment.
        </motion.p>
      ) : (
        <motion.ul
          className="mt-10 space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {items.map((s, idx) => (
            <motion.li
              key={`${s.title}-${idx}`}
              className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow"
              variants={itemVariants}
            >
              <div className="p-5">
                {/* Title (clickable, opens in new tab) */}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base md:text-lg font-semibold leading-snug transition-colors duration-200 hover:underline hover:text-blue-600 dark:hover:text-yellow-400"
                >
                  {s.title}
                </a>

                {/* Collapsible: What you'll learn */}
                {Array.isArray(s.about) && s.about.length > 0 && (
                  <SectionToggle label="What you’ll learn">
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 dark:text-gray-200">
                      {s.about.map((point, i) => (
                        <li key={`about-${idx}-${i}`}>{point}</li>
                      ))}
                    </ul>
                  </SectionToggle>
                )}

                {/* Collapsible: Modules */}
                {Array.isArray(s.modules) && s.modules.length > 0 && (
                  <SectionToggle label="Modules">
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 dark:text-gray-200">
                      {s.modules.map((m, i) => (
                        <li key={`module-${idx}-${i}`}>{m}</li>
                      ))}
                    </ul>
                  </SectionToggle>
                )}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </main>
  );
}
