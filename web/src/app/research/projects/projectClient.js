"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTimes, FaFilter, FaChevronDown } from "react-icons/fa";
import { slugify } from "@/lib/slug";
import { containerVariants, itemVariants } from "@/lib/animations";

const normalizeTeams = (proj) =>
  Array.isArray(proj?.teams)
    ? proj.teams.map((t) => String(t?.name || "").trim()).filter(Boolean)
    : [];

const sortStrings = (values) =>
  Array.from(values)
    .map((v) => (typeof v === "string" ? v : v?.name || v?.title || String(v || "")))
    .map((v) => v.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

const toDomainEntries = (proj) => {
  if (Array.isArray(proj?.domains)) {
    return proj.domains
      .map((d) => {
        const name = typeof d === "string" ? d : d?.name || "";
        const slug = d?.slug || slugify(name);
        return name ? { name, slug } : null;
      })
      .filter(Boolean);
  }

  if (Array.isArray(proj?.domain)) {
    return proj.domain
      .map((name) => {
        const safeName = typeof name === "string" ? name.trim() : "";
        return safeName ? { name: safeName, slug: slugify(safeName) } : null;
      })
      .filter(Boolean);
  }

  return [];
};

const normalizeProject = (p) => {
  const domainEntries = toDomainEntries(p);
  const domainNames = domainEntries.map((d) => d.name).filter(Boolean);

  const memberObjs = Array.isArray(p?.members) ? p.members : [];
  const memberNames = memberObjs.map((m) => m?.name || m?.fullName || m).filter(Boolean);
  const memberSlugs = memberObjs.map((m) => m?.slug).filter(Boolean);

  const leadName = p?.leadName || p?.lead || "";
  const leadSlug = p?.leadSlug || p?.leadDetails?.slug || "";

  return {
    title: p?.title || "",
    slug: p?.slug || "",
    lead: leadName,
    leadSlug,
    regions: p?.region ? [String(p.region)] : [],
    domains: domainEntries,
    domainNames,
    members: memberNames.length ? memberNames : normalizeTeams(p),
    memberSlugs,
    isIndustryEngagement: Boolean(p?.isIndustryEngagement),
  };
};

export default function ProjectsClient({ projects: rawProjects = [] }) {
  const searchParams = useSearchParams();
  
  // ---- State filters ----
  const [q, setQ] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [leadFilter, setLeadFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Read theme from URL params (from themes page)
  useEffect(() => {
    const themeParam = searchParams.get("theme");
    if (themeParam) {
      setThemeFilter(themeParam);
      setShowFilters(true);
    }
  }, [searchParams]);

  const projects = useMemo(() => {
    const src = Array.isArray(rawProjects) ? rawProjects : [];
    return src
      .map(normalizeProject)
      .filter((p) => p.title && !p.isIndustryEngagement);
  }, [rawProjects]);

  const { regionOptions, domainOptions, leadOptions, memberOptions } = useMemo(() => {
    const regions = new Set();
    const domains = new Set();
    const leads = new Set();
    const members = new Set();

    for (const p of projects) {
      p.regions.forEach((r) => r && regions.add(r));
      p.domainNames.forEach((d) => d && domains.add(d));
      if (p.lead) leads.add(p.lead);
      p.members.forEach((m) => m && members.add(m));
    }

    return {
      regionOptions: sortStrings(regions),
      domainOptions: sortStrings(domains),
      leadOptions: sortStrings(leads),
      memberOptions: sortStrings(members),
    };
  }, [projects]);

  // filtering
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return projects.filter((p) => {
      const haystack = [
        p.title,
        p.lead,
        ...p.domainNames,
        ...p.regions,
        ...p.members,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQ = !query || haystack.includes(query);
      const matchesRegion = !regionFilter || p.regions.includes(regionFilter);
      const matchesDomain = !domainFilter || p.domainNames.includes(domainFilter);
      const matchesLead = !leadFilter || p.lead === leadFilter;
      const matchesMember = !memberFilter || p.members.includes(memberFilter);
      // Theme filter - check if project has themes and if the theme matches
      const matchesTheme = !themeFilter || (p.themes && p.themes.some(t => 
        t.toLowerCase().includes(themeFilter.toLowerCase())
      ));

      return matchesQ && matchesRegion && matchesDomain && matchesLead && matchesMember && matchesTheme;
    });
  }, [projects, q, regionFilter, domainFilter, leadFilter, memberFilter, themeFilter]);

  const hasActiveFilters = q || regionFilter || domainFilter || leadFilter || memberFilter || themeFilter;

  const clearFilters = () => {
    setQ("");
    setRegionFilter("");
    setDomainFilter("");
    setLeadFilter("");
    setMemberFilter("");
    setThemeFilter("");
  };

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="page-header">
            <h1 className="page-header-title">Projects</h1>
            <p className="page-header-subtitle">
              Explore our research projects across various domains
            </p>
          </motion.div>

          {/* Search bar - prominently placed at top */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search projects by title, lead, department..."
                  className="input pl-11 pr-10 text-base"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Filter toggle button */}
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${showFilters || hasActiveFilters
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              `}
            >
              <FaFilter className="text-xs" />
              Filters
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary-600 text-white">
                  {[regionFilter, domainFilter, leadFilter, memberFilter, themeFilter].filter(Boolean).length}
                </span>
              )}
              <FaChevronDown className={`text-xs transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </motion.div>

          {/* Collapsible filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-8"
              >
                <div className="card p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="label">Region</label>
                      <select
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        className="select"
                      >
                        <option value="">All regions</option>
                        {regionOptions.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Department</label>
                      <select
                        value={domainFilter}
                        onChange={(e) => setDomainFilter(e.target.value)}
                        className="select"
                      >
                        <option value="">All departments</option>
                        {domainOptions.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Lead</label>
                      <select
                        value={leadFilter}
                        onChange={(e) => setLeadFilter(e.target.value)}
                        className="select"
                      >
                        <option value="">All leads</option>
                        {leadOptions.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Member</label>
                      <select
                        value={memberFilter}
                        onChange={(e) => setMemberFilter(e.target.value)}
                        className="select"
                      >
                        <option value="">All members</option>
                        {memberOptions.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Theme</label>
                      <input
                        value={themeFilter}
                        onChange={(e) => setThemeFilter(e.target.value)}
                        placeholder="Filter by theme..."
                        className="input"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-muted">
                        {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
                      </span>
                      <button
                        onClick={clearFilters}
                        className="text-sm text-primary-600 dark:text-accent-400 hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Project list */}
          <div>
            {filtered.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((p, i) => {
                  const projectSlug = p.slug;
                  const content = (
                    <div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors">
                        {p.title}
                      </div>
                      <div className="mt-3 text-sm text-muted space-y-1.5">
                        {p.lead && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Lead:</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{p.lead}</span>
                          </div>
                        )}
                        {p.domains.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500">Dept:</span>
                            <div className="flex flex-wrap gap-1">
                              {p.domains.map((d, idx) => (
                                <span
                                  key={`${d.slug}-${idx}`}
                                  className="badge-gray"
                                >
                                  {d.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {p.regions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Region:</span>
                            <span>{p.regions[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );

                  return (
                    <motion.div
                      key={`${p.title}-${i}`}
                      variants={itemVariants}
                      className="card card-hover p-5"
                    >
                      {projectSlug ? (
                        <Link
                          href={`/research/projects/${encodeURIComponent(projectSlug)}`}
                          className="block group"
                          aria-label={`Open project ${p.title || `#${i + 1}`}`}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="block group">{content}</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No projects found matching your criteria.</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="btn btn-secondary mt-4">
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
