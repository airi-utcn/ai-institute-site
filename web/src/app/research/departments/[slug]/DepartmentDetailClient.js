"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FaUsers, FaFlask, FaBook, FaInfoCircle, FaArrowLeft, FaEnvelope, FaGlobe, FaStar, FaProjectDiagram, FaUserCog, FaUserTie } from "react-icons/fa";

const TABS = [
  { id: "overview", label: "Overview", icon: FaInfoCircle },
  { id: "members", label: "People & Teams", icon: FaUsers },
  { id: "projects", label: "Projects", icon: FaFlask },
  { id: "publications", label: "Publications", icon: FaBook },
];

const PHASE_STYLES = {
  ongoing:   'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  planned:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
  completed: 'bg-gray-100   dark:bg-gray-700      text-gray-600   dark:text-gray-300',
  archived:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

/* ── Person avatar + name (reusable) ─────────────────────── */
function PersonChip({ person, role, isLead, image }) {
  const slug = person?.slug;
  const name = person?.name || person?.fullName || '';
  const title = person?.title || '';

  const inner = (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
      slug ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group' : ''
    }`}>
      <div className="relative shrink-0">
        <img
          src={image || "/people/Basic_avatar_image.png"}
          alt={name}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
        />
        {isLead && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
            <FaStar className="w-2 h-2 text-yellow-800" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${
          slug ? 'group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors' : ''
        }`}>
          {name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {role || title || ''}
        </p>
      </div>
    </div>
  );

  return slug ? <Link href={`/people/${slug}`}>{inner}</Link> : inner;
}

/* ── Team card (inline in Members tab) ───────────────────── */
function TeamCard({ team, staffLookup }) {
  const leads = (team.members || []).filter((m) => m.isLead);
  const others = (team.members || []).filter((m) => !m.isLead);
  const ordered = [...leads, ...others];

  return (
    <motion.div
      variants={itemVariants}
      className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden"
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-blue-500 to-indigo-500" />

      <div className="pl-5 pr-5 pt-5 pb-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <FaUsers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug truncate">
              {team.name}
            </h3>
            {team.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                {team.description}
              </p>
            )}
          </div>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0">
            {ordered.length} {ordered.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Members */}
        {ordered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 -mx-1">
            {ordered.map((m, i) => {
              const personSlug = m.person?.slug || '';
              const staffInfo = staffLookup?.[personSlug];
              return (
                <PersonChip
                  key={personSlug || i}
                  person={m.person}
                  role={m.role}
                  isLead={m.isLead}
                  image={staffInfo?.image}
                />
              );
            })}
          </div>
        )}

        {/* Projects */}
        {team.projects?.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 mb-2">
              <FaProjectDiagram className="w-3 h-3 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Projects
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {team.projects.map((p, i) => {
                const phaseClass = PHASE_STYLES[p.phase] || PHASE_STYLES.planned;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full font-medium"
                  >
                    {p.title}
                    {p.phase && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${phaseClass}`}>
                        {p.phase}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

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
}) {
  const [activeTab, setActiveTab] = useState("overview");

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
        const s = m.person?.slug;
        if (s) slugs.add(s);
      }
    }
    const independent = staff.filter((p) => p.slug && !slugs.has(p.slug));
    return { teamMemberSlugs: slugs, independentStaff: independent };
  }, [teams, staff]);

  if (!department) {
    return (
      <main className="page-container">
        <div className="content-wrapper content-padding">
          <div className="empty-state">
            <p>Department not found.</p>
            <Link href="/research/departments" className="btn btn-primary mt-4">
              Back to Departments
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const counts = {
    members: staff.length,
    projects: projects.length,
    publications: publications.length,
  };

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link 
            href="/research/departments" 
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
          >
            <FaArrowLeft className="text-xs" />
            Back to Departments
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="page-header-title">{department.name}</h1>
          {department.summary && (
            <p className="page-header-subtitle">{department.summary}</p>
          )}
        </motion.div>

        {/* Quick stats */}
        <motion.div 
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-accent-400">
              {counts.members}
            </div>
            <div className="text-sm text-muted">Members</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-accent-400">
              {counts.projects}
            </div>
            <div className="text-sm text-muted">Projects</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-accent-400">
              {counts.publications}
            </div>
            <div className="text-sm text-muted">Publications</div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                  flex items-center gap-2
                  ${isActive 
                    ? "bg-primary-600 text-white shadow-md dark:bg-accent-500" 
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }
                `}
              >
                <Icon className="text-sm" />
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span className={`
                    text-xs px-1.5 py-0.5 rounded-full
                    ${isActive 
                      ? "bg-white/20 text-white" 
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }
                  `}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Description */}
              {department.description && (
                <motion.div variants={itemVariants} className="card p-6">
                  <h2 className="heading-3 heading-accent mb-4">About</h2>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="text-body">{department.description}</p>
                  </div>
                </motion.div>
              )}

              {/* Coordinator */}
              {department.coordinator && (
                <motion.div variants={itemVariants} className="card p-6">
                  <h2 className="heading-3 heading-accent mb-4">Coordinator</h2>
                  {(() => {
                    const coordName = typeof department.coordinator === 'string' 
                      ? department.coordinator 
                      : department.coordinator.name || department.coordinator.fullName || 'Unknown';
                    const coordSlug = department.coordinatorSlug || department.coordinator?.slug;
                    const coordTitle = department.coordinator?.title;
                    const personPath = coordSlug ? `/people/${coordSlug}` : null;
                    
                    const content = (
                      <div className={`flex items-center gap-4 ${personPath ? 'cursor-pointer group' : ''}`}>
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <FaUsers className="text-2xl text-gray-400" />
                        </div>
                        <div>
                          <p className={`font-semibold text-gray-900 dark:text-white ${personPath ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors' : ''}`}>
                            {coordName}
                          </p>
                          {coordTitle && (
                            <p className="text-sm text-muted">{coordTitle}</p>
                          )}
                        </div>
                      </div>
                    );
                    
                    return personPath ? (
                      <Link href={personPath}>
                        {content}
                      </Link>
                    ) : content;
                  })()}
                </motion.div>
              )}

              {/* Contact links */}
              {department.contactLinks && department.contactLinks.length > 0 && (
                <motion.div variants={itemVariants} className="card p-6">
                  <h2 className="heading-3 heading-accent mb-4">Contact</h2>
                  <div className="flex flex-wrap gap-3">
                    {department.contactLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm inline-flex items-center gap-2"
                      >
                        {link.label?.includes('mail') ? <FaEnvelope /> : <FaGlobe />}
                        {link.label || link.url}
                      </a>
                    ))}
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
              {/* ── Teams ────────────────────────────────── */}
              {teams.length > 0 && (
                <div>
                  <motion.div variants={itemVariants} className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      <FaUsers className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Teams</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {teams.length}
                    </span>
                  </motion.div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {teams.map((team, i) => (
                      <TeamCard key={team.id || i} team={team} staffLookup={staffLookup} />
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
                      {teams.length > 0 ? 'Independent Researchers' : 'Members'}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {independentStaff.length}
                    </span>
                  </motion.div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {independentStaff.map((person) => (
                      <motion.div
                        key={person.slug}
                        variants={itemVariants}
                        className="card card-hover p-4"
                      >
                        <Link href={`/people/${person.slug}`} className="block text-center group">
                          <div className="w-20 h-20 mx-auto mb-3">
                            <img
                              src={person.image || "/people/Basic_avatar_image.png"}
                              alt={person.name}
                              className="w-full h-full rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                            />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors">
                            {person.name}
                          </h3>
                          {person.title && (
                            <p className="text-xs text-muted mt-1 line-clamp-1">{person.title}</p>
                          )}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {staff.length === 0 && teams.length === 0 && (
                <div className="empty-state">
                  <p>No members found for this department.</p>
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
            >
              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project, idx) => (
                    <motion.div
                      key={project.slug || idx}
                      variants={itemVariants}
                      className="card card-hover p-5"
                    >
                      <Link 
                        href={`/research/projects/${project.slug}`}
                        className="block group"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors">
                          {project.title}
                        </h3>
                        {project.lead && (
                          <p className="text-sm text-muted mt-2">
                            Lead: {project.lead}
                          </p>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No projects found for this department.</p>
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
            >
              {publications.length > 0 ? (
                <div className="space-y-4">
                  {publications.map((pub, idx) => (
                    <motion.div
                      key={pub.slug || idx}
                      variants={itemVariants}
                      className="card card-hover p-5"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {pub.slug ? (
                          <Link 
                            href={`/research/publications/${pub.slug}`}
                            className="hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
                          >
                            {pub.title}
                          </Link>
                        ) : pub.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pub.year && <span className="badge-primary">{pub.year}</span>}
                        {pub.kind && <span className="badge-gray">{pub.kind}</span>}
                      </div>
                      {pub.authors && pub.authors.length > 0 && (
                        <p className="text-sm text-muted mt-2">
                          {Array.isArray(pub.authors) 
                            ? pub.authors.map(a => typeof a === 'string' ? a : a.name).join(", ")
                            : pub.authors}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No publications found for this department.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
