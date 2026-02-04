"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FaUsers, FaFlask, FaBook, FaInfoCircle, FaArrowLeft, FaEnvelope, FaGlobe } from "react-icons/fa";

const TABS = [
  { id: "overview", label: "Overview", icon: FaInfoCircle },
  { id: "members", label: "Members", icon: FaUsers },
  { id: "projects", label: "Projects", icon: FaFlask },
  { id: "publications", label: "Publications", icon: FaBook },
];

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
  staff = [] 
}) {
  const [activeTab, setActiveTab] = useState("overview");

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
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <FaUsers className="text-2xl text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {typeof department.coordinator === 'string' 
                          ? department.coordinator 
                          : department.coordinator.name || 'Unknown'}
                      </p>
                      {department.coordinator.title && (
                        <p className="text-sm text-muted">{department.coordinator.title}</p>
                      )}
                    </div>
                  </div>
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
            >
              {staff.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {staff.map((person) => (
                    <motion.div
                      key={person.slug}
                      variants={itemVariants}
                      className="card card-hover p-4"
                    >
                      <Link href={`/people/staff/${person.slug}`} className="block text-center">
                        <div className="w-20 h-20 mx-auto mb-3">
                          <img
                            src={person.image || "/people/Basic_avatar_image.png"}
                            alt={person.name}
                            className="w-full h-full rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                          />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                          {person.name}
                        </h3>
                        {person.title && (
                          <p className="text-xs text-muted mt-1 line-clamp-1">{person.title}</p>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
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
