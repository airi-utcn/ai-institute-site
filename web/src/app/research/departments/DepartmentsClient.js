"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { techTransferPage } from "./TechTransferClient.js";
import { hpcAIPage } from "./HPCAIServicesClient.js"

// TODO: Remove slug creators, can be integrated into Strapi

/* --- Animations --- */
const containerVariants = {
  hidden: { opacity: 0.9 }, visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.1 } },
};
const itemVariants = { hidden: { y: 12, opacity: 0.95 }, visible: { y: 0, opacity: 1 } };

/* --- Helpers --- */
const slugify = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const buildProjectRows = (projects = []) => {
  const rows = [];
  for (const project of projects) {
    if (!project?.title) continue;
    const domains = Array.isArray(project?.domains)
      ? project.domains
      : Array.isArray(project?.domain)
      ? project.domain.filter(Boolean).map((name) => ({ name, slug: slugify(name) }))
      : [];
    const themes = Array.isArray(project?.themes) ? project.themes.filter(Boolean) : [];
    const projectSlug = project?.slug || slugify(project?.title);
    const fallbackMember = Array.isArray(project?.members) ? project.members[0] : null;
    const personSlug = project?.leadSlug || fallbackMember?.slug || "";
    const personName = project?.leadName || fallbackMember?.name || project?.lead || "";
    const lead = project?.leadName || project?.lead || personName;

    if (!domains.length) {
      rows.push({
        personName,
        personSlug,
        title: project.title,
        lead,
        domain: "",
        domainSlug: "",
        projectSlug,
        themes,
      });
      continue;
    }

    for (const domain of domains) {
      const domainName = domain?.name || domain;
      const domainSlug = domain?.slug || slugify(domainName || "");
      rows.push({
        personName,
        personSlug,
        title: project.title,
        lead,
        domain: domainName,
        domainSlug,
        projectSlug,
        themes,
      });
    }
  }
  return rows;
};

const buildPublicationRows = (publications = []) => {
  const rows = [];
  for (const publication of publications) {
    if (!publication?.title) continue;
    const authors = Array.isArray(publication?.authors) ? publication.authors : [];
    const entry = {
      title: publication.title,
      year: publication.year,
      kind: publication.kind,
      description: publication.description,
      domain: publication.domain,
      docUrl: publication.docUrl,
    };

    if (!authors.length) {
      rows.push({ ...entry, personName: "", personSlug: "" });
      continue;
    }

    for (const author of authors) {
      rows.push({
        ...entry,
        personName: author?.name || "",
        personSlug: author?.slug || "",
      });
    }
  }
  return rows;
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
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3">
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

export default function DepartmentsClient({
  staffData = [],
  departments = [],
  supportUnits = [],
  projects = [],
  publications = [],
}) {
  const supportUnitsList = useMemo(() => {
    const passed = Array.isArray(supportUnits) ? supportUnits : [];
    
    // Check if static units are already present to avoid duplicates
    const hasTech = passed.some(u => u.name === "Technology Transfer & Development Unit");
    const hasHPC = passed.some(u => u.name === "HPC-AI Services");

    const extra = [];
    if (!hasTech) {
      extra.push({
        name: "Technology Transfer & Development Unit",
        slug: "technology-transfer-development-unit",
        type: "support",
        // Minimum fields to prevent potential access errors before detail view override
        description: "",
        coordinator: "",
      });
    }

    if (!hasHPC) {
      extra.push({
        name: "HPC-AI Services",
        slug: "hpc-ai-services",
        type: "support",
         // Minimum fields
        description: "",
        coordinator: "",
      });
    }
    
    return [...passed, ...extra];
  }, [supportUnits]);

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitView, setUnitView] = useState("details");

  const titleRef = useRef(null);        
  const mobileBarRef = useRef(null);

  const departmentList = Array.isArray(departments) ? departments : [];
  const departmentGroups = useMemo(() => {
    const groups = {};
    for (const dept of departmentList) {
      const type = (dept?.type || "research").toString();
      if (!groups[type]) groups[type] = [];
      groups[type].push(dept);
    }
    // sort each group by name
    Object.values(groups).forEach((list) => list.sort((a, b) => (a?.name || "").localeCompare(b?.name || "", "ro", { sensitivity: "base", numeric: true })));
    return groups;
  }, [departmentList]);

  const typeLabel = (type) => {
    const map = {
      research: "Research departments",
      academic: "Academic departments",
      support: "Support departments",
      other: "Departments",
    };
    return map[type] || type || "Departments";
  };
  const staffList = Array.isArray(staffData) ? staffData : [];
  const projectList = Array.isArray(projects) ? projects : [];
  const publicationList = Array.isArray(publications) ? publications : [];

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit);
    setUnitView("details");
    if (typeof window !== "undefined") {
      window.history.pushState({ department: unit.name }, "", "");
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      if (selectedUnit) setSelectedUnit(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectedUnit]);

  /* --- Global aggregates --- */
  const globalProjects = useMemo(() => buildProjectRows(projectList), [projectList]);

  const globalPublications = useMemo(
    () => buildPublicationRows(publicationList),
    [publicationList]
  );

  /* --- Themes --- */
  const unitThemes = useMemo(() => {
    if (!selectedUnit) return [];
    const seen = new Set();
    const themesOut = [];

    for (const proj of projectList) {
      const domains = Array.isArray(proj?.domain) ? proj.domain : [];
      if (!domains.includes(selectedUnit.name)) continue;

      const themes = Array.isArray(proj?.themes) ? proj.themes.filter(Boolean) : [];
      for (const th of themes) {
        const t = String(th).trim();
        if (!t || seen.has(t)) continue;
        seen.add(t);
        themesOut.push({ theme: t });
      }
    }
    return themesOut;
  }, [selectedUnit, projectList]);

  /* --- Unit-scoped aggregates --- */
  const unitProjects = useMemo(() => {
    if (!selectedUnit) return [];
    const seen = new Set();
    const unique = [];

    for (const row of globalProjects) {
      const matchesName = row.domain && selectedUnit.name && row.domain.trim().toLowerCase() === selectedUnit.name.trim().toLowerCase();
      const matchesSlug = row.domainSlug && selectedUnit.slug && row.domainSlug === selectedUnit.slug;
      if (!matchesName && !matchesSlug) continue;

      const key = `${row.projectSlug}|${row.domainSlug || row.domain || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
    }
    return unique;
  }, [selectedUnit, globalProjects]);

  const unitPublications = useMemo(() => {
    if (!selectedUnit) return [];
    const seen = new Set();
    const unique = [];

    for (const row of globalPublications) {
      if (row.domain !== selectedUnit.name) continue;
      const key = `${(row.title || "").toLowerCase().trim()}|${row.year || ""}|${row.domain || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
    }
    return unique;
  }, [selectedUnit, globalPublications]);

  const unitMembers = useMemo(() => {
    if (!selectedUnit) return [];
    const unitName = String(selectedUnit.name || "").trim().toLowerCase();
    const unitSlug = String(selectedUnit.slug || "").trim();

    return staffList.filter((p) => {
      const depName = String(p?.department || "").trim();
      const depSlug = String(p?.departmentInfo?.slug || "").trim();
      const matchesName = depName && depName.toLowerCase() === unitName;
      const matchesSlug = depSlug && unitSlug && depSlug === unitSlug;
      return matchesName || matchesSlug;
    });
  }, [selectedUnit, staffList]);

  /* --- Render helpers --- */
  const renderProjects = (rows) =>
    rows.length ? (
      <ul className="space-y-4">
        {rows.map((row, i) => (
          <li
            key={`${row.personSlug}-${row.projectSlug}-${i}`}
            className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            {row.personSlug ? (
              <Link
                href={`/research/projects/${encodeURIComponent(row.projectSlug || slugify(row.title || ""))}`}
                className="block group"
              >
                <div className="font-medium group-hover:underline text-gray-900 dark:text-gray-100">
                  {row.title}
                </div>
                {row.lead && (
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Lead:</span> {row.lead}
                  </div>
                )}
              </Link>
            ) : (
              <div className="block">
                <div className="font-medium text-gray-900 dark:text-gray-100">{row.title}</div>
                {row.lead && (
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Lead:</span> {row.lead}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500">No projects found.</p>
    );

  const renderPublications = (rows) =>
    rows.length ? (
      <ul className="space-y-4">
        {rows.map((pb, i) => (
          <li
            key={`${pb.personSlug}-${pb.title}-${i}`}
            className="rounded-xl border border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="flex items-baseline gap-2">
              <div className="font-medium text-gray-900 dark:text-gray-100">{pb.title}</div>
              {typeof pb.year !== "undefined" && <span className="text-sm opacity-70">({pb.year})</span>}
            </div>
            {pb.description && (
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{pb.description}</p>
            )}
            {pb.docUrl && (
              <a
                href={pb.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm underline opacity-80 hover:opacity-100"
                aria-label="Open publication documentation"
              >
                View documentation ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500">No publications found.</p>
    );

  const renderMembersCards = (rows) =>
    rows.length ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rows.map((m) => (
          <Link
            key={m.slug}
            href={`/people/staff/${encodeURIComponent(m.slug)}`}
            className="group rounded-xl border p-4 hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                {(() => {
                  const imageSrc = m.image || "/people/Basic_avatar_image.png";
                  return (
                    <img
                      src={imageSrc}
                      alt={m.name}
                      width={64}
                      height={64}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full rounded-full object-cover"
                    />
                  );
                })()}
              </div>
              <div>
                <div className="font-semibold group-hover:underline text-gray-900 dark:text-gray-100">{m.name}</div>
                {m.title && (
                  <div className="text-sm text-gray-800 dark:text-gray-200 font-medium md:opacity-80">
                    {m.title}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    ) : (
      <p className="text-gray-500">No members found.</p>
    );

  const renderThemes = (rows) =>
    rows.length ? (
      <ul className="space-y-2">
        {rows.map((t, idx) => (
          <li
            key={`${t.theme}-${idx}`}
            className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm"
          >
            {t.theme}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500">No themes found.</p>
    );

  const descriptionText = selectedUnit?.description || selectedUnit?.descriere || "";
  
  const coordinator =
    selectedUnit?.coordinator ||
    selectedUnit?.coordonator ||
    selectedUnit?.["coordonator"] ||
    "";
  const coCoordinator =
    selectedUnit?.coCoordinator ||
    selectedUnit?.["co-coordonator"] ||
    selectedUnit?.coCoordonator ||
    selectedUnit?.co_coordinator ||
    "";
  const elements = Array.isArray(selectedUnit?.elements) ? selectedUnit.elements : [];
  const isSupportUnit = selectedUnit?.type === "support" ? true : false;

  const unitMembersSorted = useMemo(
    () =>
      Array.isArray(unitMembers)
        ? [...unitMembers].sort((a, b) =>
          (a?.name || "").localeCompare(b?.name || "", "ro", {
            sensitivity: "base",
            numeric: true,
          })
        )
      : [],
    [unitMembers]
  );

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <div className="card p-6 md:p-8">
          <section>
            {!selectedUnit && (
              <>
                {Object.entries(departmentGroups).map(([type, units]) => (
                  <div key={type} className="mb-10">
                    <motion.h1
                      variants={itemVariants}
                      className="heading-1 heading-accent text-center mb-6"
                    >
                      {typeLabel(type)}
                    </motion.h1>

                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {units.map((unit, index) => (
                          <motion.div
                            key={`${type}-${unit.slug || index}`}
                            variants={itemVariants}
                            className="card card-hover p-4 md:p-5 cursor-pointer"
                            onClick={() => handleUnitClick(unit)}
                          >
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                              {unit.name}
                            </h2>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                ))}

                {supportUnitsList.length > 0 && (
                  <div className="mb-6">
                    <motion.h1
                      variants={itemVariants}
                      className="heading-1 heading-accent text-center mb-6"
                    >
                      Support departments
                    </motion.h1>
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {supportUnitsList.map((unit, index) => (
                          <motion.div
                            key={`support-${unit.slug || index}`}
                            variants={itemVariants}
                            className="card card-hover p-4 md:p-5 cursor-pointer"
                            onClick={() => handleUnitClick(unit)}
                          >
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                              {unit.name}
                            </h2>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}
              </>
            )}
              
            {selectedUnit && !isSupportUnit && (
              <>
                <h2
                  ref={titleRef}
                  className="heading-2 heading-accent mb-4"
                >
                  {selectedUnit.name}
                </h2>

                <div
                  ref={mobileBarRef}
                  className="sticky top-0 z-20 -mx-6 mb-4 bg-gray-100 dark:bg-gray-800 border-b px-4 py-3"
                >
                  <div className="flex justify-center md:justify-start">
                    <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden max-w-full overflow-x-auto whitespace-nowrap">
                      {[
                        { id: "details", label: "Details" },
                        { id: "themes", label: "Themes" },
                        { id: "projects", label: "Projects" },
                        { id: "members", label: "Members" },
                        { id: "publications", label: "Publications" },
                      ].map((it) => {
                        const active = unitView === it.id;
                        return (
                          <button
                            key={it.id}
                            onClick={() => setUnitView(it.id)}
                            className={`px-4 py-2 text-sm font-medium focus:outline-none ${
                              active
                                ? "bg-blue-600 text-white dark:bg-blue-500"
                                : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                            }`}
                            aria-pressed={active}
                          >
                            {it.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {unitView === "details" && (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <motion.div variants={itemVariants} className="space-y-4">
                      {descriptionText && (
                        <p className="text-gray-700 dark:text-gray-300">{descriptionText}</p>
                      )}

                      {!!coordinator && (
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          <span className="font-semibold">Coordinator:</span> {coordinator}
                        </p>
                      )}
                      {!!coCoordinator && (
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          <span className="font-semibold">Deputy:</span> {coCoordinator}
                        </p>
                      )}

                      {elements.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            Categories:
                          </p>

                          {elements.map((el, i) => (
                            <SectionToggle key={`${el.text}-${i}`} label={el.text}>
                              {Array.isArray(el.content) ? (
                                <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
                                  {el.content.map((p, idx) => (
                                    <p key={idx}>{p}</p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                  {String(el.content || "")}
                                </p>
                              )}
                            </SectionToggle>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}

                {unitView === "themes" && renderThemes(unitThemes)}
                {unitView === "projects" && renderProjects(unitProjects)}
                {unitView === "members" && renderMembersCards(unitMembersSorted)}
                {unitView === "publications" && renderPublications(unitPublications)}
              </>
            )}
            
            {selectedUnit && isSupportUnit && (
              <>
                <h2
                  ref={titleRef}
                  className="heading-2 heading-accent mb-4"
                >
                  {selectedUnit.name}
                </h2>

                {unitView === "details" && (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <motion.div variants={itemVariants} className="space-y-4">
                      {selectedUnit.name === "Technology Transfer & Development Unit" ? (
                        <>{techTransferPage}</>
                      ) : selectedUnit.name === "HPC-AI Services" ? (
                        <>{hpcAIPage}</>
                      ) : (
                        selectedUnit.description && (
                          <p className="text-body">{selectedUnit.description}</p>
                        )
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
