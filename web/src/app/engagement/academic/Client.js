"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  {
    key: "Overview",
    subtabs: [
      { key: "partnerships" },
      { key: "teaching" },
      { key: "mobility" },
    ],
  },
  {
    key: "Initiatives",
    subtabs: [
      { key: "schools" },
      { key: "seminars" },
      { key: "visits" },
    ],
  },
  {
    key: "Courses",
    subtabs: [
      { key: "ml" },
      { key: "robotics" },
      { key: "hpc" },
      { key: "ethics" },
    ],
  },
  {
    key: "Mobility",
    subtabs: [
      { key: "phd" },
      { key: "grants" },
      { key: "placements" },
    ],
  },
];

const ACADEMIC_STRINGS = {
  "title": "Academic engagement",
  "description": "Collaborations with universities and institutes: co-tutoring, joint courses, workshops, research visits, mobility.",
  "contactButton": "Contact the academic team",
  "selectTopic": "Select a topic from the left menu.",
  "Tabs.Overview.label": "Overview",
  "Tabs.Overview.subtabs.partnerships": "Academic partnerships",
  "Tabs.Overview.subtabs.teaching": "Teaching & training",
  "Tabs.Overview.subtabs.mobility": "Mobility",
  "Tabs.Initiatives.label": "Initiatives",
  "Tabs.Initiatives.subtabs.schools": "Summer schools & workshops",
  "Tabs.Initiatives.subtabs.seminars": "Joint seminars",
  "Tabs.Initiatives.subtabs.visits": "Research visits",
  "Tabs.Courses.label": "Courses & Workshops",
  "Tabs.Courses.subtabs.ml": "Machine Learning",
  "Tabs.Courses.subtabs.robotics": "Robotics & Vision",
  "Tabs.Courses.subtabs.hpc": "HPC for AI",
  "Tabs.Courses.subtabs.ethics": "AI Ethics & Safety",
  "Tabs.Mobility.label": "Co-tutoring & Mobility",
  "Tabs.Mobility.subtabs.phd": "Co-supervision",
  "Tabs.Mobility.subtabs.grants": "Mobility grants",
  "Tabs.Mobility.subtabs.placements": "Placements & exchanges",
  "Content.Overview.partnerships.title": "Academic partnerships",
  "Content.Overview.partnerships.desc": "A network of collaborations and joint activities.",
  "Content.Overview.teaching.title": "Teaching & training",
  "Content.Overview.teaching.desc": "Courses, summer schools, and workshops.",
  "Content.Overview.mobility.title": "Mobility",
  "Content.Overview.mobility.desc": "Co-tutoring, visits, internships, exchanges.",
  "Content.Initiatives.schools.title": "Summer schools & workshops",
  "Content.Initiatives.schools.desc": "International and local events for students and researchers.",
  "Content.Initiatives.seminars.title": "Joint seminars",
  "Content.Initiatives.seminars.desc": "Collaborative talks & invited speakers.",
  "Content.Initiatives.visits.title": "Research visits",
  "Content.Initiatives.visits.desc": "Short-term & long-term research stays.",
  "Content.Courses.ml.title": "Machine Learning",
  "Content.Courses.ml.desc": "Joint courses, applied modules, projects.",
  "Content.Courses.robotics.title": "Robotics & Vision",
  "Content.Courses.robotics.desc": "Hands-on labs, automation, and vision systems.",
  "Content.Courses.hpc.title": "HPC for AI",
  "Content.Courses.hpc.desc": "GPU programming & large-scale AI training.",
  "Content.Courses.ethics.title": "AI Ethics & Safety",
  "Content.Courses.ethics.desc": "Fairness, explainability & governance in AI.",
  "Content.Mobility.phd.title": "Co-supervision",
  "Content.Mobility.phd.desc": "Joint PhD supervision with international partners.",
  "Content.Mobility.grants.title": "Mobility grants",
  "Content.Mobility.grants.desc": "Funding for exchanges & research stays.",
  "Content.Mobility.placements.title": "Placements & exchanges",
  "Content.Mobility.placements.desc": "Internships, visits, and staff exchanges.",
  "Event.title": "“Progress and Innovation in Ophthalmology” Forum 2025",
  "Event.desc1": "The 3rd edition of “Eye and AI” workshop is jointly organized by the Department of Ophthalmology, “Iuliu Hațieganu” University of Medicine and Pharmacy, the Cluj County Emergency Clinical Hospital, and the Artificial Intelligence Research Institute (AIRi@UTCN), Technical University of Cluj-Napoca, Romania. Bringing together clinicians, researchers, and industry practitioners, the event explores how artificial intelligence is transforming ophthalmic care—from imaging and screening to decision support and workflow optimization.",
  "Event.moderators": "Moderators:",
  "Event.moderatorsNames": "Adrian GROZA, Anca MĂRGINEAN, Radu-Răzvan SLĂVESCU",
  "Event.paper1Title": "Reconstructing Compact 3D OCT Volumes from B-scans: a Comparative Study of U-Net Architectures",
  "Event.paper1Authors": "Adrian POP — Technical University, Cluj-Napoca",
  "Event.paper2Title": "3D Reconstruction Based on the AROI Set",
  "Event.paper2Authors": "Cristian Raul MOLDOVAN, Radu-Răzvan SLĂVESCU — Technical University, Cluj-Napoca",
  "Event.paper3Title": "Adapting Vision Foundation Models for OCT and Eye Fundus",
  "Event.paper3Authors": "Anca MĂRGINEAN — Technical University, Cluj-Napoca",
  "Event.paper4Title": "Segmentation of the Retinal Vascular Network and Biomarker Quantification in OCTA Imaging",
  "Event.paper4Authors": "Darius STAN, Raluca BREHAR — Technical University, Cluj-Napoca",
  "Event.linkText": "View full event details →",
};

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
        {emoji && <div className="text-2xl" aria-hidden>{emoji}</div>}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{desc}</div>
        </div>
      </div>
    </motion.div>
  );
}

function SectionTitle({ emoji, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      {emoji && <div className="text-2xl" aria-hidden>{emoji}</div>}
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

  const t = (key) => ACADEMIC_STRINGS[key] || key;

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

  function renderSubContent(tab, sub) {
    if (tab === "Courses" && sub === "ml") {
      return (
        <div>
          <SectionTitle 
            title={t(`Content.${tab}.${sub}.title`)} 
            desc={t(`Content.${tab}.${sub}.desc`)} 
          />
          <br/>
          <Feature
            title={t("Event.title")}
            desc={
              <>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                  {t("Event.desc1")}
                </p>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <strong>{t("Event.moderators")}</strong> {t("Event.moderatorsNames")}
                </p>

                <ul className="space-y-2 list-disc pl-5 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>{t("Event.paper1Title")}</strong>
                    <br />
                    {t("Event.paper1Authors")}
                  </li>
                  <li>
                    <strong>{t("Event.paper2Title")}</strong>
                    <br />
                    {t("Event.paper2Authors")}
                  </li>
                  <li>
                    <strong>{t("Event.paper3Title")}</strong>
                    <br />
                    {t("Event.paper3Authors")}
                  </li>
                  <li>
                    <strong>{t("Event.paper4Title")}</strong>
                    <br />
                    {t("Event.paper4Authors")}
                  </li>
                </ul>

                <a
                  href="https://elitemedicale.ro/forumul-progrese-si-inovatii-in-oftalmologie-2025/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t("Event.linkText")}
                </a>
              </>
            }
          />
        </div>
      );
    }

    if (ACADEMIC_STRINGS[`Content.${tab}.${sub}.title`]) {
      return (
        <SectionTitle 
          title={t(`Content.${tab}.${sub}.title`)} 
          desc={t(`Content.${tab}.${sub}.desc`)} 
        />
      );
    }

    return <div className="text-gray-500">{t("selectTopic")}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10">
        <motion.div key="main-container" variants={containerVariants} initial="hidden" animate="visible">
          
          <motion.h1
            variants={itemVariants}
            className="text-2xl md:text-3xl font-extrabold mb-2 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
          >
            {t("title")}
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-center text-gray-700 dark:text-gray-300 max-w-3xl mx-auto"
          >
            {t("description")}
          </motion.p>

          <div className="mt-6 md:mt-8">
            <div className="flex justify-start">
              <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden max-w-full overflow-x-auto whitespace-nowrap">
                {TABS.map((tObj) => {
                  const active = tab === tObj.key;
                  return (
                    <button
                      key={tObj.key}
                      type="button"
                      onClick={() => setTab(tObj.key)}
                      aria-pressed={active}
                      className={
                        "px-4 py-2 text-sm font-medium focus:outline-none " +
                        (active
                          ? "bg-blue-600 text-white dark:bg-blue-500"
                          : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900")
                      }
                    >
                      {t(`Tabs.${tObj.key}.label`)}
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
                    {t(`Tabs.${activeTab.key}.subtabs.${st.key}`)}
                  </button>
                );
              })}
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={`${tab}-${sub}`}
                className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-sm"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} 
              >
                {renderSubContent(tab, sub)}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition"
            >
              {t("contactButton")}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
