"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FaUsers, FaFlask, FaBook, FaInfoCircle, FaArrowLeft, FaEnvelope, FaGlobe, FaStar, FaProjectDiagram, FaUserCog, FaUserTie } from "react-icons/fa";
import ExpandableMarkdown from "@/components/shared/ExpandableMarkdown";
import RichMarkdown from "@/components/shared/RichMarkdown";
import TeamCard from "@/components/TeamCard";
import PersonChip from "@/components/shared/PersonChip";

const PHASE_STYLES = {
  ongoing:   'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  planned:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
  ended:     'bg-gray-100   dark:bg-gray-700      text-gray-600   dark:text-gray-300',
  archived:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

const DEFAULT_TEXTS = {
  backToDepartments: "Back to Departments",
  notFound: "Department not found.",
  membersCount: "Members",
  projectsCount: "Projects",
  publicationsCount: "Publications",
  "tabs.overview": "Overview",
  "tabs.members": "People & Teams",
  "tabs.projects": "Projects",
  "tabs.publications": "Publications",
  "overview.about": "About",
  "overview.coordinator": "Coordinator",
  "overview.contact": "Contact",
  "members.teams": "Teams",
  "members.member": "member",
  "members.membersPlural": "members",
  "members.independentResearchers": "Independent Researchers",
  "members.noMembers": "No members found for this department.",
  "members.projects": "Projects",
  "projects.lead": "Lead:",
  "projects.noProjects": "No projects found for this department.",
  "publications.noPublications": "No publications found for this department.",
  "phases.completed": "Completed",
  "phases.planned": "Planned",
  "phases.ongoing": "Ongoing",
  "phases.ended": "Ended",
  "phases.archived": "Archived",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DepartmentDetailClient({ 
  department, 
  projects = [], 
  publications = [], 
  staff = [],
  teams = [],
  pageData,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const t = (key) => {
    if (key === "backToDepartments") return pageData?.depBackToDepartments || DEFAULT_TEXTS.backToDepartments;
    if (key === "notFound") return pageData?.depNotFound || DEFAULT_TEXTS.notFound;
    if (key === "tabs.overview") return pageData?.depTabOverview || DEFAULT_TEXTS["tabs.overview"];
    if (key === "tabs.members") return pageData?.depTabMembers || DEFAULT_TEXTS["tabs.members"];
    if (key === "tabs.projects") return pageData?.depTabProjects || DEFAULT_TEXTS["tabs.projects"];
    if (key === "tabs.publications") return pageData?.depTabPublications || DEFAULT_TEXTS["tabs.publications"];
    if (key === "members.noMembers") return pageData?.depNoMembers || DEFAULT_TEXTS["members.noMembers"];
    if (key === "projects.noProjects") return pageData?.depNoProjects || DEFAULT_TEXTS["projects.noProjects"];
    if (key === "publications.noPublications") return pageData?.depNoPublications || DEFAULT_TEXTS["publications.noPublications"];
    return DEFAULT_TEXTS[key] || key;
  };

  const TABS = [
    { id: "overview", label: t("tabs.overview"), icon: FaInfoCircle },
    { id: "members", label: t("tabs.members"), icon: FaUsers },
    { id: "projects", label: t("tabs.projects"), icon: FaFlask },
    { id: "publications", label: t("tabs.publications"), icon: FaBook },
  ];

  /* Build a lookup map: slug → staff member (for images etc.) */
  const staffLookup = useMemo(() => {
    const map = {};
    for (const s of staff) {
      if (s.slug) map[s.slug] = s;
    }
    return map;
  }, [staff]);

  /* Figure out which people are on a team vs independent */
  const { teamMemberSlugs, independentStaff } = useMemo(() => {
    const slugs = new Set();
    for (const team of teams) {
      for (const m of team.members || []) {
        if (m.person?.slug) slugs.add(m.person.slug);
      }
    }
    const independent = staff.filter((p) => p.slug && !slugs.has(p.slug));
    return { teamMemberSlugs: slugs, independentStaff: independent };
  }, [teams, staff]);

  if (!department) {
    return (
      <div className="page-container">
        <div className="content-wrapper content-padding">
          <div className="empty-state">
            <h1 className="text-2xl font-bold mb-4">{t("notFound")}</h1>
            <Link
              href="/research/departments"
              className="inline-flex items-center gap-2 text-primary-600 dark:text-accent-400 hover:underline"
            >
              <FaArrowLeft className="w-4 h-4" />
              {t("backToDepartments")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const coordinator = department.coordinator;
  const coordinatorImage = coordinator?.slug ? staffLookup[coordinator.slug]?.image : null;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="content-wrapper content-padding py-8">
          {/* Breadcrumb / Back button */}
          <Link
            href="/research/departments"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-accent-400 mb-6 transition-colors"
          >
            <FaArrowLeft className="w-3.5 h-3.5" />
            {t("backToDepartments")}
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
                {department.name}
              </h1>
              {department.summary && (
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                  {department.summary}
                </p>
              )}
            </div>

            {/* Quick stats pills */}
            <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <FaUsers className="w-3.5 h-3.5" />
                <span>{staff.length} {DEFAULT_TEXTS.membersCount}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium">
                <FaFlask className="w-3.5 h-3.5" />
                <span>{projects.length} {DEFAULT_TEXTS.projectsCount}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <FaBook className="w-3.5 h-3.5" />
                <span>{publications.length} {DEFAULT_TEXTS.publicationsCount}</span>
              </div>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 -mb-px mt-8 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              let count = null;
              if (tab.id === "members") count = staff.length;
              if (tab.id === "projects") count = projects.length;
              if (tab.id === "publications") count = publications.length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-primary-600 text-primary-600 dark:border-accent-400 dark:text-accent-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {count !== null && count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main tab content */}
      <div className="content-wrapper content-padding py-10">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Coordinator card */}
              {coordinator && (
                <motion.div variants={itemVariants} className="card p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-accent-400 uppercase tracking-wider mb-4">
                    <FaUserCog className="w-3.5 h-3.5" />
                    <span>{DEFAULT_TEXTS["overview.coordinator"]}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <img
                      src={coordinatorImage || "/people/Basic_avatar_image.png"}
                      alt={coordinator.name || "Coordinator"}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {coordinator.slug ? (
                          <Link
                            href={`/people/${encodeURIComponent(coordinator.slug)}`}
                            className="hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
                          >
                            {coordinator.name}
                          </Link>
                        ) : (
                          coordinator.name
                        )}
                      </h3>
                      {coordinator.title && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {coordinator.title}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Description */}
              {department.description && (
                <motion.div variants={itemVariants} className="card p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {DEFAULT_TEXTS["overview.about"]}
                  </h2>
                  <RichMarkdown content={department.description} />
                </motion.div>
              )}

              {/* Contact info */}
              {(department.email || department.phone || department.location) && (
                <motion.div variants={itemVariants} className="card p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {DEFAULT_TEXTS["overview.contact"]}
                  </h2>
                  <div className="flex flex-wrap gap-6 text-sm">
                    {department.email && (
                      <a
                        href={`mailto:${department.email}`}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
                      >
                        <FaEnvelope className="w-4 h-4 text-gray-400" />
                        <span>{department.email}</span>
                      </a>
                    )}
                    {department.location && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <FaGlobe className="w-4 h-4 text-gray-400" />
                        <span>{department.location}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "members" && (
            <motion.div
              key="members"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* ── Teams ────────────────────────────────────── */}
              {teams.length > 0 && (
                <div>
                  <motion.div variants={itemVariants} className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      <FaUsers className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("members.teams")}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {teams.length}
                    </span>
                  </motion.div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {teams.map((team, i) => (
                      <TeamCard key={team.id || i} team={team} staffLookup={staffLookup} t={t} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Independent researchers ───────────────── */}
              {independentStaff.length > 0 && (
                <div>
                  <motion.div variants={itemVariants} className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                      <FaUserTie className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {teams.length > 0 ? t("members.independentResearchers") : t("tabs.members")}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {independentStaff.length}
                    </span>
                  </motion.div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {independentStaff.map((p, i) => (
                      <div
                        key={p.slug || i}
                        className="card p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <PersonChip
                          person={{ name: p.name, slug: p.slug, title: p.title }}
                          image={p.image}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {staff.length === 0 && teams.length === 0 && (
                <div className="empty-state">
                  <p>{t("members.noMembers")}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "projects" && (
            <motion.div
              key="projects"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((p, i) => (
                    <motion.div
                      key={p.slug || i}
                      variants={itemVariants}
                      className="card card-hover p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-bold text-gray-900 dark:text-white text-base">
                            {p.slug ? (
                              <Link
                                href={`/research/projects/${encodeURIComponent(p.slug)}`}
                                className="hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
                              >
                                {p.title}
                              </Link>
                            ) : (
                              p.title
                            )}
                          </h3>
                        </div>
                        {p.abstract && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                            {p.abstract}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
                        {p.lead && (
                          <span>
                            {DEFAULT_TEXTS["projects.lead"]} {p.lead.name}
                          </span>
                        )}
                        {(p.startDate || p.endDate) && (
                          <span>
                            {p.startDate ? new Date(p.startDate).getFullYear() : ""}
                            {p.endDate ? ` – ${new Date(p.endDate).getFullYear()}` : " – Present"}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>{t("projects.noProjects")}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "publications" && (
            <motion.div
              key="publications"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {publications.length > 0 ? (
                <div className="space-y-3">
                  {publications.map((pub, i) => (
                    <motion.div
                      key={pub.slug || i}
                      variants={itemVariants}
                      className="card p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                        {pub.slug ? (
                          <Link
                            href={`/research/publications/${encodeURIComponent(pub.slug)}`}
                            className="hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
                          >
                            {pub.title}
                          </Link>
                        ) : (
                          pub.title
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {pub.authors && (
                          <span>
                            {Array.isArray(pub.authors)
                              ? pub.authors.map((a) => (typeof a === "object" ? a?.name : a)).filter(Boolean).join(", ")
                              : typeof pub.authors === "string"
                              ? pub.authors
                              : ""}
                          </span>
                        )}
                        {pub.year && <span>• {pub.year}</span>}
                        {pub.type && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                            {pub.type}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>{t("publications.noPublications")}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
