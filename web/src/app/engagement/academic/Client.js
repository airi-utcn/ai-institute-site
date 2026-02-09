"use client";

import Link from "next/link";
import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  {
    key: "Overview",
    label: "Overview",
    subtabs: [
      { key: "partnerships", label: "Academic partnerships" },
      { key: "teaching", label: "Teaching & training" },
      { key: "mobility", label: "Mobility" },
    ],
  },
  {
    key: "Initiatives",
    label: "Initiatives",
    subtabs: [
      { key: "schools", label: "Summer schools & workshops" },
      { key: "seminars", label: "Joint seminars" },
      { key: "visits", label: "Research visits" },
    ],
  },
  {
    key: "Courses",
    label: "Courses & Workshops",
    subtabs: [
      { key: "ml", label: "Machine Learning" },
      { key: "robotics", label: "Robotics & Vision" },
      { key: "hpc", label: "HPC for AI" },
      { key: "ethics", label: "AI Ethics & Safety" },
    ],
  },
  {
    key: "Mobility",
    label: "Co-tutoring & Mobility",
    subtabs: [
      { key: "phd", label: "Co-supervision" },
      { key: "grants", label: "Mobility grants" },
      { key: "placements", label: "Placements & exchanges" },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0.9 },
  visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };

function Feature({ emoji, title, desc }) {
  return (
    <motion.div
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800/70 transition"
      variants={itemVariants}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden>{emoji}</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

function SectionTitle({ emoji, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-2xl" aria-hidden>{emoji}</div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{desc}</p>
      </div>
    </div>
  );
}

export default function Client() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "Overview";

  // ---------------------------------------------------------------------------
  // get path params
  const setTab = useCallback(
    (t) => router.replace(`?tab=${encodeURIComponent(t)}`, { scroll: false }),
    [router]
  );

  const sub = sp.get("sub") || TABS.find((t) => t.key === tab)?.subtabs?.[0]?.key;

  const setSub = useCallback(
    (s) =>
      router.replace(`?tab=${encodeURIComponent(tab)}&sub=${encodeURIComponent(s)}`, {
        scroll: false,
      }),
    [router, tab]
  );

  const activeTab = TABS.find((t) => t.key === tab);

  // ---------------------------------------------------------------------------
  // render inner content for main topics
  function renderSubContent(tab, sub) {
    if (tab === "Overview") {
      if (sub === "partnerships")
        return <SectionTitle title="Academic partnerships" desc="A network of collaborations and joint activities." />;

      if (sub === "teaching")
        return <SectionTitle title="Teaching & training" desc="Courses, summer schools, and workshops." />;

      if (sub === "mobility")
        return <SectionTitle title="Mobility" desc="Co-tutoring, visits, internships, exchanges." />;
    }

    if (tab === "Initiatives") {
      if (sub === "schools")
        return <SectionTitle title="Summer schools & workshops" desc="International and local events for students and researchers." />;

      if (sub === "seminars")
        return <SectionTitle title="Joint seminars" desc="Collaborative talks & invited speakers." />;

      if (sub === "visits")
        return <SectionTitle title="Research visits" desc="Short-term & long-term research stays." />;
    }

    if (tab === "Courses") {
      if (sub === "ml")
        return <div>
          <SectionTitle title="Machine Learning" desc="Joint courses, applied modules, projects." />
          <br/>
          <Feature
            title="“Progress and Innovation in Ophtalmoogy” Forum 2025"
            desc={
              <>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                  The 3rd edition of “Eye and AI” workshop is jointly organized by the Department of Ophthalmology, “Iuliu Hațieganu” University of Medicine and Pharmacy, the Cluj County Emergency Clinical Hospital, and the Artificial Intelligence Research Institute (AIRi@UTCN), Technical University of Cluj-Napoca, Romania. Bringing together clinicians, researchers, and industry practitioners, the event explores how artificial intelligence is transforming ophthalmic care—from imaging and screening to decision support and workflow optimization.
                </p>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <strong>Moderators:</strong> Adrian GROZA, Anca MĂRGINEAN, Radu-Răzvan SLĂVESCU
                </p>

                <ul className="space-y-2 list-disc pl-5 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>Reconstructing Compact 3D OCT Volumes from B-scans: a Comparative Study of U-Net Architectures</strong>
                    <br />
                    Adrian POP — Technical University, Cluj-Napoca
                  </li>

                  <li>
                    <strong>3D Reconstruction Based on the AROI Set</strong>
                    <br />
                    Cristian Raul MOLDOVAN, Radu-Răzvan SLĂVESCU — Technical University, Cluj-Napoca
                  </li>

                  <li>
                    <strong>Adapting Vision Foundation Models for OCT and Eye Fundus</strong>
                    <br />
                    Anca MĂRGINEAN — Technical University, Cluj-Napoca
                  </li>

                  <li>
                    <strong>Segmentation of the Retinal Vascular Network and Biomarker Quantification in OCTA Imaging</strong>
                    <br />
                    Darius STAN, Raluca BREHAR — Technical University, Cluj-Napoca
                  </li>
                </ul>

                <a
                  href="https://elitemedicale.ro/forumul-progrese-si-inovatii-in-oftalmologie-2025/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  View full event details →
                </a>
              </>
            }
          />
        </div>;


      if (sub === "robotics")
        return <SectionTitle title="Robotics & Vision" desc="Hands-on labs, automation, and vision systems." />;

      if (sub === "hpc")
        return <SectionTitle title="HPC for AI" desc="GPU programming & large-scale AI training." />;

      if (sub === "ethics")
        return <SectionTitle title="AI Ethics & Safety" desc="Fairness, explainability & governance in AI." />;
    }

    if (tab === "Mobility") {
      if (sub === "phd")
        return <SectionTitle title="Co-supervision" desc="Joint PhD supervision with international partners." />;

      if (sub === "grants")
        return <SectionTitle title="Mobility grants" desc="Funding for exchanges & research stays." />;

      if (sub === "placements")
        return <SectionTitle title="Placements & exchanges" desc="Internships, visits, and staff exchanges." />;
    }

    return <div className="text-gray-500">Select a topic from the left menu.</div>;
  }

  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.h1
            variants={itemVariants}
            className="text-2xl md:text-3xl font-extrabold mb-2 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
          >
            Academic engagement
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-center text-gray-700 dark:text-gray-300 max-w-3xl mx-auto"
          >
            Collaborations with universities and institutes: co-tutoring, joint courses, workshops, research visits, mobility.
          </motion.p>

          <div className="mt-6 md:mt-8">
            <div className="flex justify-start">
              <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden max-w-full overflow-x-auto whitespace-nowrap">
                {TABS.map((t) => {
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      aria-pressed={active}
                      className={
                        "px-4 py-2 text-sm font-medium focus:outline-none " +
                        (active
                          ? "bg-blue-600 text-white dark:bg-blue-500"
                          : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900")
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 border-b border-gray-200 dark:border-gray-800" />
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">

            {/* left submenu */}
            <div className="flex flex-col gap-2 border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-900 h-fit">
              {activeTab?.subtabs?.map((st) => {
                const active = sub === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => setSub(st.key)}
                    className={
                      "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition " +
                      (active
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800")
                    }
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
            {/* right content */}
            <motion.div
              className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-sm"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {renderSubContent(tab, sub)}
            </motion.div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition"
            >
              Contact the academic team
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
