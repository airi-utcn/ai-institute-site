"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

/* Animations */
const containerVariants = {
  hidden: { opacity: 0.9 }, visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };

/* Helpers */
const slugify = (s) =>
  String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

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
  // ---- State filtre ----
  const [q, setQ] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [leadFilter, setLeadFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");

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
        ...p.domains,
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

      return matchesQ && matchesRegion && matchesDomain && matchesLead && matchesMember;
    });
  }, [projects, q, regionFilter, domainFilter, leadFilter, memberFilter]);

  const clearFilters = () => {
    setQ("");
    setRegionFilter("");
    setDomainFilter("");
    setLeadFilter("");
    setMemberFilter("");
  };

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="page-header">
            <h1 className="page-header-title">Projects</h1>
          </motion.div>

          {/* GRID: sidebar (filters) + list */}
          <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
            {/* Sidebar filters */}
            <aside>
              <div className="filter-sidebar">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title, lead, department…"
                  className="input"
                />

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

                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-secondary btn-sm w-full"
                >
                  Reset filters
                </button>
              </div>
            </aside>

            {/* Project list */}
            <div>
              {filtered.length ? (
                <ul className="space-y-3">
                  {filtered.map((p, i) => {
                    const projectSlug = p.slug;
                    const content = (
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors">
                          {p.title}
                        </div>
                        <div className="mt-2 text-sm text-muted space-y-1">
                          <div>{p.lead ? `Lead: ${p.lead}` : "Lead: —"}</div>
                          <div className="flex gap-2 flex-wrap">
                            <span>Department:</span>
                            {p.domains.length ? (
                              <span className="space-x-2">
                                {p.domains.map((d, idx) => (
                                  <Link
                                    key={`${d.slug}-${idx}`}
                                    href={`/research/departments?unit=${encodeURIComponent(d.slug || slugify(d.name))}`}
                                    className="link"
                                  >
                                    {d.name}
                                  </Link>
                                ))}
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                          {p.regions.length ? <div>Region: {p.regions[0]}</div> : null}
                        </div>
                      </div>
                    );

                    return (
                      <motion.li
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
                      </motion.li>
                    );
                  })}
                </ul>
              ) : (
                <div className="empty-state">No projects found.</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
