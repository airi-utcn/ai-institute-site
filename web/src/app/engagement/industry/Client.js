"use client";

import Link from "next/link";
import { useMemo, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  { key: "Overview", label: "Overview" },
  { key: "Projects", label: "Projects" },
  { key: "Engagement", label: "How we work" },
];

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
    ? project.domains.map((d) => d?.name).filter(Boolean)
    : [];

  const partners = Array.isArray(project?.partners)
    ? project.partners.filter(Boolean)
    : Array.isArray(project?.partnersData)
    ? project.partnersData.map((p) => p?.name).filter(Boolean)
    : [];

  // Use partnersData from transformProjectData if available (contains logo info)
  const expandedPartners = Array.isArray(project?.partnersData) ? project.partnersData : [];

  return {
    id: project?.id ?? null,
    title: project?.title || "",
    slug: project?.slug || "",
    abstract: project?.abstract || "",
    phase: project?.phase || "",
    lead: project?.leadName || project?.lead || "",
    domains,
    partners,
    expandedPartners,
    docUrl: project?.docUrl || "",
    officialUrl: project?.oficialUrl || project?.officialUrl || "",
    isIndustryEngagement: project?.isIndustryEngagement || false,
    heroImage: project?.heroImage || null,
  };
};

export default function Client({ projects: rawProjects = [] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "Overview";

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
      // Show only industry engagement projects
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

  const content = useMemo(() => {
    switch (tab) {
      case "Projects":
        return (
          <motion.section className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by project, lead, partner…"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="">All domains</option>
                {domainOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {filteredProjects.length ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => (
                  <motion.article
                    key={p.id || p.slug || p.title}
                    variants={itemVariants}
                    className="flex flex-col h-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Hero Image or Partner Logos area */}
                    <div className="relative h-48 bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-6 border-b border-gray-100 dark:border-gray-800">
                      {p.heroImage ? (
                        <div className="absolute inset-0">
                          <img
                            src={p.heroImage}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                        </div>
                      ) : null}

                      {/* Overly Partner Logos (if any) - display primary logo */}
                      <div className="relative z-10 flex gap-4">
                        {p.expandedPartners.map((partner) =>
                          partner.logo ? (
                            <div key={partner.name} className="h-16 w-16 bg-white rounded-lg p-2 shadow-sm flex items-center justify-center" title={partner.name}>
                              <img src={partner.logo} alt={partner.name} className="max-h-full max-w-full object-contain" />
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 p-5 gap-3">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap gap-2 text-xs">
                          {p.domains.map((d) => (
                            <span key={`${p.title}-${d}`} className="rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 font-medium border border-blue-100 dark:border-blue-800">
                              {d}
                            </span>
                          ))}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                          {p.title}
                        </h3>
                        
                        {p.abstract ? (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                            {p.abstract}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                         <div className="text-xs text-gray-500 dark:text-gray-500">
                           {p.lead ? `Lead: ${p.lead}` : null}
                         </div>
                         <div className="flex gap-3 text-sm font-medium">
                          {p.slug ? (
                            <Link
                              href={`/research/projects/${encodeURIComponent(p.slug)}`}
                              className="text-blue-600 dark:text-yellow-400 hover:underline"
                            >
                              Details
                            </Link>
                          ) : null}
                          {p.officialUrl ? (
                            <a
                              href={p.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-yellow-400 hover:underline"
                            >
                              Site
                            </a>
                          ) : null}
                          {p.docUrl ? (
                            <a
                              href={p.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-yellow-400 hover:underline"
                            >
                              Docs
                            </a>
                          ) : null}
                         </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No projects match your filters yet.</p>
            )}
          </motion.section>
        );
      case "Engagement":
        return (
          <motion.section className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
            <motion.h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100" variants={itemVariants}>
              Engagement model
            </motion.h2>
            <motion.div
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm"
              variants={itemVariants}
            >
              <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Joint applied research with measurable outcomes</li>
                <li>Prototyping and validation with your teams</li>
                <li>Knowledge transfer and long-term collaboration</li>
              </ul>
            </motion.div>
          </motion.section>
        );
      default:
        return (
          <motion.section className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
            <div className="grid gap-4 md:grid-cols-3">
              <Feature title="Applied research" desc="Industrial collaborations targeting real-world deployment." />
              <Feature title="Co-development" desc="Shared roadmaps, rapid prototyping, and validation cycles." />
              <Feature title="Knowledge transfer" desc="Bridging research outcomes into production teams." />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <motion.div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm" variants={itemVariants}>
                <div className="text-sm text-gray-500 dark:text-gray-400">Active projects</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-yellow-400">{stats.projectCount}</div>
              </motion.div>
              <motion.div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm" variants={itemVariants}>
                <div className="text-sm text-gray-500 dark:text-gray-400">Domains involved</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-yellow-400">{stats.domainCount}</div>
              </motion.div>
              <motion.div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm" variants={itemVariants}>
                <div className="text-sm text-gray-500 dark:text-gray-400">Partners</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-yellow-400">{stats.partnerCount}</div>
              </motion.div>
            </div>
          </motion.section>
        );
    }
  }, [tab, query, domainFilter, domainOptions, filteredProjects, stats]);

  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.h1
            variants={itemVariants}
            className="text-2xl md:text-3xl font-extrabold mb-2 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
          >
            Industry engagement
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-center text-gray-700 dark:text-gray-300 max-w-3xl mx-auto"
          >
            Partner with AIRi on applied research and technology transfer, from discovery to deployment.
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

          <div className="mt-6">{content}</div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition"
            >
              Contact the industry team
            </Link>
            <Link
              href="/research/projects"
              className="inline-flex items-center rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
            >
              Explore all projects
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
