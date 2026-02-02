"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toPublicationSlug } from "@/lib/slug";

export default function StaffDetailClient({ person, publications, projects, slug }) {
  const [view, setView] = useState("publications");
  
  // Publications filters
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  // Projects filters  
  const [pQuery, setPQuery] = useState("");
  const [pDomainFilter, setPDomainFilter] = useState("");
  const [pLeadFilter, setPLeadFilter] = useState("");

  const getLeadName = (project) =>
    project?.leadName ||
    (typeof project?.lead === "string"
      ? project.lead
      : project?.lead?.name || "");

  const slugify = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  // Publications processing
  const { yearOptions, kindOptions, domainOptions } = useMemo(() => {
    const years = [...new Set(publications.map((p) => p.year).filter((y) => y !== null))].sort((a, b) => b - a);
    const kinds = [...new Set(publications.map((p) => p.kind).filter(Boolean))];
    const domains = [...new Set(publications.map((p) => p.domain).filter(Boolean))];
    return { yearOptions: years, kindOptions: kinds, domainOptions: domains };
  }, [publications]);

  const filteredPubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publications.filter((p) => {
      const searchable = `${p.title || ""} ${p.year || ""} ${p.domain || ""} ${p.kind || ""} ${p.description || ""}`.toLowerCase();
      const matchesSearch = !q || searchable.includes(q);
      const matchesYear = !yearFilter || String(p.year) === String(yearFilter);
      const matchesKind = !kindFilter || p.kind === kindFilter;
      const matchesDomain = !domainFilter || p.domain === domainFilter;
      return matchesSearch && matchesYear && matchesKind && matchesDomain;
    });
  }, [publications, query, yearFilter, kindFilter, domainFilter]);

  // Projects processing
  const { pDomainOptions, pLeadOptions } = useMemo(() => {
    const domainsSet = new Set();
    const leadsSet = new Set();

    projects.forEach((p) => {
      (Array.isArray(p.domain) ? p.domain : []).forEach((d) => domainsSet.add(d));
      const leadName = getLeadName(p);
      if (leadName) leadsSet.add(leadName);
    });

    return {
      pDomainOptions: Array.from(domainsSet),
      pLeadOptions: Array.from(leadsSet),
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = pQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const haystack = [
        p.title || "",
        p.lead || "",
        ...(Array.isArray(p.domain) ? p.domain : []),
        p.abstract || "",
        ...(Array.isArray(p.themes) ? p.themes : []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || haystack.includes(q);
      const matchesDomain = !pDomainFilter || (Array.isArray(p.domain) && p.domain.includes(pDomainFilter));
    const matchesLead = !pLeadFilter || getLeadName(p) === pLeadFilter;

      return matchesSearch && matchesDomain && matchesLead;
    });
  }, [projects, pQuery, pDomainFilter, pLeadFilter]);

  const clearFilters = () => {
    setQuery("");
    setYearFilter("");
    setKindFilter("");
    setDomainFilter("");
  };

  const clearProjectFilters = () => {
    setPQuery("");
    setPDomainFilter("");
    setPLeadFilter("");
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setView("publications")}
            className={`px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring ${
              view === "publications"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
            }`}
          >
            📚 Publications ({publications.length})
          </button>
          <button
            type="button"
            onClick={() => setView("projects")}
            className={`px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring ${
              view === "projects"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
            }`}
          >
            📁 Projects ({projects.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "publications" ? (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
            {/* Sidebar */}
            <aside>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">Filter by year...</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">Filter by type...</option>
                  {kindOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>

                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">Filter by domain...</option>
                  {domainOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search publications..."
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />

                <button
                  onClick={clearFilters}
                  className="w-full text-sm underline opacity-80 hover:opacity-100"
                >
                  Reset filters
                </button>
              </div>
            </aside>

            {/* Publications List */}
            <div>
              {filteredPubs.length ? (
                <ul className="space-y-4">
                  {filteredPubs.map((pub, i) => {
                    const publicationSlug = toPublicationSlug(pub);
                    return (
                      <li key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      <div className="flex items-baseline gap-2">
                        <div className="font-medium">
                          {publicationSlug ? (
                            <Link
                              href={`/research/publications/${encodeURIComponent(publicationSlug)}`}
                              className="hover:underline"
                            >
                              {pub.title}
                            </Link>
                          ) : (
                            pub.title
                          )}
                        </div>
                        {pub.year && <span className="text-sm opacity-70">({pub.year})</span>}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {pub.kind && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            {pub.kind}
                          </span>
                        )}
                        {pub.domain && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                            {pub.domain}
                          </span>
                        )}
                      </div>

                      {pub.description && (
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                          {pub.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {publicationSlug ? (
                          <Link
                            href={`/research/publications/${encodeURIComponent(publicationSlug)}`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700/60 dark:text-blue-300 dark:hover:bg-blue-900/30 transition text-sm"
                          >
                            View details
                          </Link>
                        ) : null}
                        {pub.pdfFile?.url && (
                          <a
                            href={pub.pdfFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition text-sm"
                          >
                            View document
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M6 18h6" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">No publications match your filters.</p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
            {/* Sidebar */}
            <aside>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                <select
                  value={pDomainFilter}
                  onChange={(e) => setPDomainFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">Filter by domain...</option>
                  {pDomainOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={pLeadFilter}
                  onChange={(e) => setPLeadFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">Filter by lead...</option>
                  {pLeadOptions.map((lead) => (
                    <option key={lead} value={lead}>
                      {lead}
                    </option>
                  ))}
                </select>

                <input
                  value={pQuery}
                  onChange={(e) => setPQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />

                <button
                  onClick={clearProjectFilters}
                  className="w-full text-sm underline opacity-80 hover:opacity-100"
                >
                  Reset filters
                </button>
              </div>
            </aside>

            {/* Projects List */}
            <div>
              {filteredProjects.length ? (
                <ul className="space-y-4">
                  {filteredProjects.map((p, i) => {
                    const projectSlug = p?.slug || "";
                    return (
                      <li
                        key={p.slug || `${p.title}-${i}` || i}
                        className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        {projectSlug ? (
                          <Link
                            href={`/research/projects/${encodeURIComponent(projectSlug)}`}
                            className="block group"
                          >
                            <div className="font-medium group-hover:underline">{p.title}</div>
                            {getLeadName(p) && (
                              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Lead:</span> {getLeadName(p)}
                              </div>
                            )}
                            {p.abstract && (
                              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                {p.abstract}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {Array.isArray(p.domain) && p.domain.map((domain, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs"
                                >
                                  {domain}
                                </span>
                              ))}
                            </div>
                          </Link>
                        ) : (
                          <div className="block group">
                            <div className="font-medium">{p.title}</div>
                            {getLeadName(p) && (
                              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Lead:</span> {getLeadName(p)}
                              </div>
                            )}
                            {p.abstract && (
                              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                {p.abstract}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {Array.isArray(p.domain) && p.domain.map((domain, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs"
                                >
                                  {domain}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">No projects match your filters.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
