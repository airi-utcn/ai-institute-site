"use client";

import Link from "next/link";
import { useMemo, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { key: "Overview" },
  { key: "Projects" },
  { key: "Engagement" },
];

const INDUSTRY_STRINGS = {
  "ProjectsTab.searchPlaceholder": "Search by project, lead, partner…",
  "ProjectsTab.allDomains": "All domains",
  "ProjectsTab.cardLead": "Lead",
  "ProjectsTab.cardDetails": "Details",
  "ProjectsTab.cardSite": "Website",
  "ProjectsTab.cardDocs": "Documentation",
  "ProjectsTab.noProjects": "No projects match your filters yet.",
  "EngagementTab.title": "How We Work with Industry",
  "EngagementTab.listItem1": "Collaborative R&D and Technology Transfer",
  "EngagementTab.listItem2": "Contract Research and Feasibility Studies",
  "EngagementTab.listItem3": "Talent Pipeline and Co-Supervised Theses",
  "OverviewTab.feature1Title": "Applied AI Research",
  "OverviewTab.feature1Desc": "Developing state-of-the-art models for real-world industrial challenges.",
  "OverviewTab.feature2Title": "Technology Transfer",
  "OverviewTab.feature2Desc": "Accelerating deployment from lab prototypes into production environments.",
  "OverviewTab.feature3Title": "High Performance Infrastructure",
  "OverviewTab.feature3Desc": "Cutting-edge GPU computing resources to train and evaluate large-scale AI models.",
  "OverviewTab.statsProjects": "Industry Projects",
  "OverviewTab.statsDomains": "Research Domains",
  "OverviewTab.statsPartners": "Partners",
  "title": "Industry engagement",
  "description": "Partner with AIRi on applied research and technology transfer, from discovery to deployment.",
  "Tabs.Overview": "Overview",
  "Tabs.Projects": "Projects",
  "Tabs.Engagement": "How we work",
  "Buttons.contact": "Contact the Industry Team",
  "Buttons.explore": "Explore Projects",
};

const containerVariants = {
  hidden: { opacity: 0.9 },
  visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };

function Feature({ title, desc }) {
  return (
    <motion.div
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800/70 transition"
      variants={itemVariants}
    >
      <div className="flex items-start gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

const toProjectSummary = (project) => {
  const domains = Array.isArray(project?.domain)
    ? project.domain.filter(Boolean)
    : Array.isArray(project?.domains)
    ? project.domains.filter(Boolean)
    : [];

  const partners = Array.isArray(project?.partners)
    ? project.partners
        .map((p) => (typeof p === "string" ? p : p?.name))
        .filter(Boolean)
    : [];

  return {
    id: project?.id ?? null,
    slug: project?.slug || "",
    title: project?.title || "",
    abstract: project?.abstract || "",
    lead: project?.lead || "",
    isIndustryEngagement: Boolean(project?.isIndustryEngagement),
    domains,
    partners,
    websiteUrl: project?.websiteUrl || null,
    documentationUrl: project?.documentationUrl || null,
    heroImage: project?.heroImage || null,
  };
};

export default function Client({ projects: rawProjects = [] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "Overview";
  const t = (key) => INDUSTRY_STRINGS[key] || key;

  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const setTab = useCallback(
    (t) => router.replace(`?tab=${encodeURIComponent(t)}`, { scroll: false }),
    [router]
  );

  const projects = useMemo(() => {
    const list = Array.isArray(rawProjects) ? rawProjects : [];
    return list.map(toProjectSummary).filter((p) => p.title);
  }, [rawProjects]);

  const domainOptions = useMemo(() => {
    const domains = new Set();
    projects.forEach((p) => p.domains.forEach((d) => d && domains.add(d)));
    return Array.from(domains).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => p.isIndustryEngagement)
      .filter((p) => {
        const haystack = [p.title, p.abstract, p.lead, ...p.domains, ...p.partners]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !q || haystack.includes(q);
        const matchesDomain = !domainFilter || p.domains.includes(domainFilter);
        return matchesQuery && matchesDomain;
      });
  }, [projects, query, domainFilter]);

  const stats = useMemo(() => {
    const domains = new Set();
    const partners = new Set();
    const industryProjects = projects.filter((p) => p.isIndustryEngagement);
    industryProjects.forEach((p) => {
      p.domains.forEach((d) => d && domains.add(d));
      p.partners.forEach((x) => x && partners.add(x));
    });
    return {
      projectCount: industryProjects.length,
      domainCount: domains.size,
      partnerCount: partners.size,
    };
  }, [projects]);

  let content = null;

  if (tab === "Projects") {
    content = (
      <motion.div
        key="Projects"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("ProjectsTab.searchPlaceholder")}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("ProjectsTab.allDomains")}</option>
            {domainOptions.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>

        {filteredProjects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredProjects.map((p) => {
              return (
                <motion.div
                  key={p.id ?? p.slug}
                  variants={itemVariants}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {p.heroImage ? (
                      <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        <img
                          src={p.heroImage}
                          alt={p.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      {p.domains.map((dom) => (
                        <span
                          key={dom}
                          className="inline-block rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 text-xs font-semibold"
                        >
                          {dom}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {p.title}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {p.abstract}
                    </p>
                    {p.partners.length > 0 ? (
                      <div className="pt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Partners:
                        </span>{" "}
                        {p.partners.join(", ")}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
                    <span>
                      {p.lead ? `${t("ProjectsTab.cardLead")}: ${p.lead}` : null}
                    </span>
                    <div className="flex items-center gap-3">
                      {p.slug ? (
                        <Link
                          href={`/research/projects/${encodeURIComponent(p.slug)}`}
                          className="font-semibold text-blue-600 dark:text-yellow-400 hover:underline"
                        >
                          {t("ProjectsTab.cardDetails")}
                        </Link>
                      ) : null}
                      {p.websiteUrl ? (
                        <a
                          href={p.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {t("ProjectsTab.cardSite")}
                        </a>
                      ) : null}
                      {p.documentationUrl ? (
                        <a
                          href={p.documentationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {t("ProjectsTab.cardDocs")}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("ProjectsTab.noProjects")}</p>
          </div>
        )}
      </motion.div>
    );
  } else if (tab === "Engagement") {
    content = (
      <motion.div
        key="Engagement"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="space-y-4"
      >
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {t("EngagementTab.title")}
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>{t("EngagementTab.listItem1")}</li>
            <li>{t("EngagementTab.listItem2")}</li>
            <li>{t("EngagementTab.listItem3")}</li>
          </ul>
        </div>
      </motion.div>
    );
  } else {
    content = (
      <motion.div
        key="Overview"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="space-y-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature title={t("OverviewTab.feature1Title")} desc={t("OverviewTab.feature1Desc")} />
          <Feature title={t("OverviewTab.feature2Title")} desc={t("OverviewTab.feature2Desc")} />
          <Feature title={t("OverviewTab.feature3Title")} desc={t("OverviewTab.feature3Desc")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center bg-white dark:bg-gray-900">
            <div className="text-2xl font-extrabold text-blue-600 dark:text-yellow-400">{stats.projectCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t("OverviewTab.statsProjects")}</div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center bg-white dark:bg-gray-900">
            <div className="text-2xl font-extrabold text-blue-600 dark:text-yellow-400">{stats.domainCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t("OverviewTab.statsDomains")}</div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center bg-white dark:bg-gray-900">
            <div className="text-2xl font-extrabold text-blue-600 dark:text-yellow-400">{stats.partnerCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t("OverviewTab.statsPartners")}</div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10">
        <motion.div
          key="industry-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
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

          <div className="mt-8">
            <div className="flex justify-center">
              <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-gray-800">
                {TABS.map((tObj) => {
                  const active = tab === tObj.key;
                  return (
                    <button
                      key={tObj.key}
                      type="button"
                      onClick={() => setTab(tObj.key)}
                      aria-pressed={active}
                      className={
                        "px-4 py-2 text-sm font-medium focus:outline-none rounded-lg transition-colors " +
                        (active
                          ? "bg-blue-600 text-white dark:bg-blue-500"
                          : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60")
                      }
                    >
                      {t(`Tabs.${tObj.key}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 border-b border-gray-200 dark:border-gray-800" />
          </div>

          <div className="mt-6">
            <AnimatePresence mode="wait">
               {content}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition"
            >
              {t("Buttons.contact")}
            </Link>
            <Link
              href="/research/projects"
              className="inline-flex items-center rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
            >
              {t("Buttons.explore")}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
