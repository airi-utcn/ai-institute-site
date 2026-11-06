"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUsers,
  FaBook,
  FaInfoCircle,
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaLink,
  FaExternalLinkAlt,
  FaBullseye,
  FaProjectDiagram,
  FaUserCog,
} from "react-icons/fa";
import RichMarkdown from "@/components/shared/RichMarkdown";
import HeroHeader from "@/components/shared/HeroHeader";
import DynamicZone from "@/components/shared/DynamicZone";
import PersonChip from "@/components/shared/PersonChip";
import PeopleTeamsSection from "@/components/shared/PeopleTeamsSection";
import { getPeopleCount } from "@/lib/people";
import { usePageState } from "@/lib/usePageState";
import BackLink from "@/components/BackLink";

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
  "overview.focusItems": "Focus Areas",
  "overview.coordinator": "Coordinator",
  "overview.coCoordinator": "Co-Coordinator",
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

const SUMMARY_MARKDOWN_CLASS =
  "prose prose-lg dark:prose-invert max-w-4xl text-gray-600 dark:text-gray-300 prose-p:my-0 prose-headings:mt-4 prose-headings:mb-2 prose-a:text-primary-600 dark:prose-a:text-accent-400";

const ABOUT_MARKDOWN_CLASS =
  "prose prose-gray dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 prose-p:my-3 prose-headings:mt-6 prose-headings:mb-3 prose-li:my-1 prose-a:text-primary-600 dark:prose-a:text-accent-400";

const FOCUS_MARKDOWN_CLASS =
  "prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-li:my-0.5 prose-a:text-primary-600 dark:prose-a:text-accent-400";

const CONTACT_ICONS = {
  mail: FaEnvelope,
  phone: FaPhone,
  location: FaMapMarkerAlt,
  calendar: FaCalendarAlt,
  external: FaExternalLinkAlt,
  link: FaLink,
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

const EmptyState = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
    {children}
  </div>
);

const resolveContactHref = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  if (/^[^\s]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`;
  return raw;
};

const isExternalHref = (href) => /^https?:\/\//i.test(href);

export default function DepartmentDetailClient({
  department,
  projects = [],
  publications = [],
  staff = [],
  teams = [],
  pageData,
}) {
  const [activeTab, setActiveTab] = usePageState("tab", "overview");

  const t = (key) => {
    let val = DEFAULT_TEXTS[key] ?? key;
    const pageDataKey = key.replace(/\.([a-z])/g, (g) => g[1].toUpperCase()).replace(".", "");
    if (pageData && pageData[pageDataKey]) {
      val = pageData[pageDataKey];
    }
    return val;
  };

  const TABS = [
    { id: "overview", label: t("tabs.overview"), icon: FaInfoCircle },
    { id: "members", label: t("tabs.members"), icon: FaUsers },
    { id: "projects", label: t("tabs.projects"), icon: FaProjectDiagram },
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

  /* Mirror the shared people/teams logic: someone covered by a team is not
     also shown as an independent researcher. */
  const peopleCount = getPeopleCount(staff, teams);

  if (!department) {
    return (
      <div className="page-container">
        <div className="content-wrapper content-padding">
          <div className="empty-state">
            <h1 className="text-2xl font-bold mb-4">{t("notFound")}</h1>
            <BackLink
              href="/research/departments"
              className="inline-flex items-center gap-2 text-primary-600 dark:text-accent-400 hover:underline"
            >
              <FaArrowLeft className="w-4 h-4" />
              {t("backToDepartments")}
            </BackLink>
          </div>
        </div>
      </div>
    );
  }

  const coordinator = department.coordinator;
  const coordinatorImage = coordinator?.image || (coordinator?.slug ? staffLookup[coordinator.slug]?.image : null);
  const coordinatorImageSrcSet = coordinator?.imageSrcSet || (coordinator?.slug ? staffLookup[coordinator.slug]?.imageSrcSet : null);

  const coCoordinator = department.coCoordinator;
  const coCoordinatorImage = coCoordinator?.image || (coCoordinator?.slug ? staffLookup[coCoordinator.slug]?.image : null);
  const coCoordinatorImageSrcSet = coCoordinator?.imageSrcSet || (coCoordinator?.slug ? staffLookup[coCoordinator.slug]?.imageSrcSet : null);

  const focusItems = Array.isArray(department.focusItems) ? department.focusItems : [];
  const contactLinks = Array.isArray(department.contactLinks) ? department.contactLinks : [];
  const bodyBlocks = Array.isArray(department.body) ? department.body : [];
  const aboutMarkdown = department.rawDescription || department.description;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      <HeroHeader
        image={department.heroImage || undefined}
        srcSet={department.heroImageSrcSet || undefined}
        focalPoint={department.focalPoint}
        width={department.heroImageWidth}
        height={department.heroImageHeight}
        priority
        className="pt-8 pb-10 md:pt-12 md:pb-14"
      >
        {/* Breadcrumb / Back button */}
        <BackLink
          href="/research/departments"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-accent-400 hover:underline mb-6"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          {t("backToDepartments")}
        </BackLink>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
              {department.name}
            </h1>
            {department.summary && (
              <RichMarkdown
                content={department.summary}
                className={SUMMARY_MARKDOWN_CLASS}
              />
            )}
          </div>

          {/* Quick stats pills */}
          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium">
              <FaUsers className="w-3.5 h-3.5" />
              <span>{peopleCount} {t("membersCount")}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium">
              <FaProjectDiagram className="w-3.5 h-3.5" />
              <span>{projects.length} {t("projectsCount")}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
              <FaBook className="w-3.5 h-3.5" />
              <span>{publications.length} {t("publicationsCount")}</span>
            </div>
          </div>
        </div>
      </HeroHeader>

      {/* Navigation tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              let count = null;
              if (tab.id === "members") count = peopleCount;
              if (tab.id === "projects") count = projects.length;
              if (tab.id === "publications") count = publications.length;

              return (
                <button
                  key={tab.id}
                  type="button"
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {/* Coordinator cards */}
              {(coordinator || coCoordinator) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coordinator && (
                    <motion.div
                      variants={itemVariants}
                      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-accent-400 uppercase tracking-wider mb-3">
                        <FaUserCog className="w-3.5 h-3.5" />
                        <span>{t("overview.coordinator")}</span>
                      </div>
                      <PersonChip
                        person={coordinator}
                        isLead
                        image={coordinatorImage}
                        imageSrcSet={coordinatorImageSrcSet}
                      />
                    </motion.div>
                  )}

                  {coCoordinator && (
                    <motion.div
                      variants={itemVariants}
                      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-accent-400 uppercase tracking-wider mb-3">
                        <FaUserCog className="w-3.5 h-3.5" />
                        <span>{t("overview.coCoordinator")}</span>
                      </div>
                      <PersonChip
                        person={coCoordinator}
                        image={coCoordinatorImage}
                        imageSrcSet={coCoordinatorImageSrcSet}
                      />
                    </motion.div>
                  )}
                </div>
              )}

              {/* Focus items */}
              {focusItems.length > 0 && (
                <motion.section variants={itemVariants} className="space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                      <FaBullseye className="w-4 h-4" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {t("overview.focusItems")}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {focusItems.map((item, index) => (
                      <div
                        key={`focus-${index}`}
                        className="h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm"
                      >
                        {item.title && (
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {item.title}
                          </h3>
                        )}
                        {item.description && (
                          <RichMarkdown
                            content={item.description}
                            className={FOCUS_MARKDOWN_CLASS}
                          />
                        )}
                        {item.richContent && (
                          <RichMarkdown
                            content={item.richContent}
                            className={FOCUS_MARKDOWN_CLASS}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* About / flexible body content */}
              {(aboutMarkdown || bodyBlocks.length > 0) && (
                <motion.section variants={itemVariants} className="space-y-6">
                  {aboutMarkdown && (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {t("overview.about")}
                      </h2>
                      <RichMarkdown
                        content={aboutMarkdown}
                        className={ABOUT_MARKDOWN_CLASS}
                      />
                    </div>
                  )}

                  {bodyBlocks.length > 0 && <DynamicZone blocks={bodyBlocks} />}
                </motion.section>
              )}

              {/* Contact links */}
              {contactLinks.length > 0 && (
                <motion.section variants={itemVariants} className="space-y-5">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t("overview.contact")}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {contactLinks.map((link, index) => {
                      const href = resolveContactHref(link.url);
                      const Icon = CONTACT_ICONS[link.icon] || FaLink;
                      const external = isExternalHref(href);
                      const displayUrl = String(link.url || "")
                        .replace(/^mailto:/i, "")
                        .replace(/^tel:/i, "");

                      const content = (
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm transition-colors hover:border-primary-300 dark:hover:border-accent-500/60">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-accent-400">
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {link.label}
                            </span>
                            {link.url && link.url !== link.label && (
                              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                {displayUrl}
                              </span>
                            )}
                          </span>
                          {external && (
                            <FaExternalLinkAlt className="w-3 h-3 shrink-0 text-gray-400" aria-hidden="true" />
                          )}
                        </div>
                      );

                      if (!href) {
                        return <div key={`contact-${index}`}>{content}</div>;
                      }

                      return (
                        <a
                          key={`contact-${index}`}
                          href={href}
                          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl"
                          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        >
                          {content}
                        </a>
                      );
                    })}
                  </div>
                </motion.section>
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
              <PeopleTeamsSection
                people={staff}
                teams={teams}
                staffLookup={staffLookup}
                peopleLabel={teams.length > 0 ? t("members.independentResearchers") : t("tabs.members")}
                teamsLabel={t("members.teams")}
                emptyState={t("members.noMembers")}
                t={t}
              />
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
                      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
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
                            {t("projects.lead")} {p.lead.name}
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
                <EmptyState>{t("projects.noProjects")}</EmptyState>
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
                      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-shadow"
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
                <EmptyState>{t("publications.noPublications")}</EmptyState>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
