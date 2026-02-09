'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaBook,
  FaProjectDiagram,
  FaSearch,
  FaTimes,
  FaCalendarAlt,
  FaTag,
  FaExternalLinkAlt,
  FaFileAlt,
  FaUser,
  FaGlobe
} from 'react-icons/fa';
import { toPublicationSlug } from '@/lib/slug';
import { containerVariants, itemVariants } from '@/lib/animations';

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        active
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          active ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Filter Dropdown Component
function FilterDropdown({ value, onChange, options, placeholder, icon: Icon }) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// Publication Card Component
function PublicationCard({ publication }) {
  const publicationSlug = toPublicationSlug(publication);
  
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {publication.year && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                <FaCalendarAlt className="w-3 h-3" />
                {publication.year}
              </span>
            )}
            {publication.kind && (
              <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                {publication.kind}
              </span>
            )}
          </div>
          
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {publicationSlug ? (
              <Link
                href={`/research/publications/${encodeURIComponent(publicationSlug)}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {publication.title}
              </Link>
            ) : (
              publication.title
            )}
          </h3>
          
          {publication.domain && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              <FaGlobe className="w-3 h-3" />
              {publication.domain}
            </span>
          )}
          
          {publication.description && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {publication.description}
            </p>
          )}
        </div>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {publicationSlug && (
          <Link
            href={`/research/publications/${encodeURIComponent(publicationSlug)}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <FaFileAlt className="w-3 h-3" />
            View Details
          </Link>
        )}
        {publication.pdfFile?.url && (
          <a
            href={publication.pdfFile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <FaExternalLinkAlt className="w-3 h-3" />
            PDF
          </a>
        )}
      </div>
    </motion.div>
  );
}

// Project Card Component
function ProjectCard({ project }) {
  const projectSlug = project?.slug || '';
  
  const getLeadName = (p) =>
    p?.leadName || (typeof p?.lead === 'string' ? p.lead : p?.lead?.name || '');
  
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5"
    >
      {projectSlug ? (
        <Link href={`/research/projects/${encodeURIComponent(projectSlug)}`} className="block group">
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
            {project.title}
          </h3>
          
          {getLeadName(project) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <FaUser className="w-3 h-3" />
              <span>Lead: {getLeadName(project)}</span>
            </div>
          )}
          
          {project.abstract && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {project.abstract}
            </p>
          )}
          
          <div className="flex flex-wrap gap-1">
            {Array.isArray(project.domain) && project.domain.map((domain, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs"
              >
                {domain}
              </span>
            ))}
          </div>
        </Link>
      ) : (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {project.title}
          </h3>
          
          {getLeadName(project) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <FaUser className="w-3 h-3" />
              <span>Lead: {getLeadName(project)}</span>
            </div>
          )}
          
          {project.abstract && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {project.abstract}
            </p>
          )}
          
          <div className="flex flex-wrap gap-1">
            {Array.isArray(project.domain) && project.domain.map((domain, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs"
              >
                {domain}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function StaffDetailClient({ person, publications, projects, slug }) {
  const [activeTab, setActiveTab] = useState('publications');
  
  // Publications filters
  const [pubQuery, setPubQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');

  // Projects filters  
  const [projQuery, setProjQuery] = useState('');
  const [projDomainFilter, setProjDomainFilter] = useState('');
  const [projLeadFilter, setProjLeadFilter] = useState('');

  const getLeadName = (project) =>
    project?.leadName ||
    (typeof project?.lead === 'string'
      ? project.lead
      : project?.lead?.name || '');

  // Publications processing
  const { yearOptions, kindOptions, pubDomainOptions } = useMemo(() => {
    const years = [...new Set(publications.map((p) => p.year).filter((y) => y !== null))].sort((a, b) => b - a);
    const kinds = [...new Set(publications.map((p) => p.kind).filter(Boolean))];
    const domains = [...new Set(publications.map((p) => p.domain).filter(Boolean))];
    return { yearOptions: years, kindOptions: kinds, pubDomainOptions: domains };
  }, [publications]);

  const filteredPubs = useMemo(() => {
    const q = pubQuery.trim().toLowerCase();
    return publications.filter((p) => {
      const searchable = `${p.title || ''} ${p.year || ''} ${p.domain || ''} ${p.kind || ''} ${p.description || ''}`.toLowerCase();
      const matchesSearch = !q || searchable.includes(q);
      const matchesYear = !yearFilter || String(p.year) === String(yearFilter);
      const matchesKind = !kindFilter || p.kind === kindFilter;
      const matchesDomain = !domainFilter || p.domain === domainFilter;
      return matchesSearch && matchesYear && matchesKind && matchesDomain;
    });
  }, [publications, pubQuery, yearFilter, kindFilter, domainFilter]);

  // Projects processing
  const { projDomainOptions, projLeadOptions } = useMemo(() => {
    const domainsSet = new Set();
    const leadsSet = new Set();

    projects.forEach((p) => {
      (Array.isArray(p.domain) ? p.domain : []).forEach((d) => domainsSet.add(d));
      const leadName = getLeadName(p);
      if (leadName) leadsSet.add(leadName);
    });

    return {
      projDomainOptions: Array.from(domainsSet),
      projLeadOptions: Array.from(leadsSet),
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = projQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const haystack = [
        p.title || '',
        p.lead || '',
        ...(Array.isArray(p.domain) ? p.domain : []),
        p.abstract || '',
        ...(Array.isArray(p.themes) ? p.themes : []),
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !q || haystack.includes(q);
      const matchesDomain = !projDomainFilter || (Array.isArray(p.domain) && p.domain.includes(projDomainFilter));
      const matchesLead = !projLeadFilter || getLeadName(p) === projLeadFilter;

      return matchesSearch && matchesDomain && matchesLead;
    });
  }, [projects, projQuery, projDomainFilter, projLeadFilter]);

  const hasActiveFilters = activeTab === 'publications' 
    ? (pubQuery || yearFilter || kindFilter || domainFilter)
    : (projQuery || projDomainFilter || projLeadFilter);

  const clearFilters = () => {
    if (activeTab === 'publications') {
      setPubQuery('');
      setYearFilter('');
      setKindFilter('');
      setDomainFilter('');
    } else {
      setProjQuery('');
      setProjDomainFilter('');
      setProjLeadFilter('');
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2 mb-8">
        <TabButton
          active={activeTab === 'publications'}
          onClick={() => setActiveTab('publications')}
          icon={FaBook}
          label="Publications"
          count={publications.length}
        />
        <TabButton
          active={activeTab === 'projects'}
          onClick={() => setActiveTab('projects')}
          icon={FaProjectDiagram}
          label="Projects"
          count={projects.length}
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-8"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={activeTab === 'publications' ? pubQuery : projQuery}
              onChange={(e) => activeTab === 'publications' ? setPubQuery(e.target.value) : setProjQuery(e.target.value)}
              placeholder={activeTab === 'publications' ? 'Search publications...' : 'Search projects...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          {activeTab === 'publications' ? (
            <>
              <FilterDropdown
                value={yearFilter}
                onChange={setYearFilter}
                options={yearOptions.map(String)}
                placeholder="All Years"
                icon={FaCalendarAlt}
              />
              <FilterDropdown
                value={kindFilter}
                onChange={setKindFilter}
                options={kindOptions}
                placeholder="All Types"
                icon={FaTag}
              />
              <FilterDropdown
                value={domainFilter}
                onChange={setDomainFilter}
                options={pubDomainOptions}
                placeholder="All Domains"
                icon={FaGlobe}
              />
            </>
          ) : (
            <>
              <FilterDropdown
                value={projDomainFilter}
                onChange={setProjDomainFilter}
                options={projDomainOptions}
                placeholder="All Domains"
                icon={FaGlobe}
              />
              <FilterDropdown
                value={projLeadFilter}
                onChange={setProjLeadFilter}
                options={projLeadOptions}
                placeholder="All Leads"
                icon={FaUser}
              />
            </>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <FaTimes className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'publications' ? (
          <div>
            {filteredPubs.length > 0 ? (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="grid gap-4 md:grid-cols-2"
              >
                {filteredPubs.map((pub, i) => (
                  <PublicationCard key={pub.slug || i} publication={pub} />
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <FaBook className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {publications.length === 0 
                    ? 'No publications available.'
                    : 'No publications match your filters.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredProjects.length > 0 ? (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="grid gap-4 md:grid-cols-2"
              >
                {filteredProjects.map((project, i) => (
                  <ProjectCard key={project.slug || i} project={project} />
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <FaProjectDiagram className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {projects.length === 0 
                    ? 'No projects available.'
                    : 'No projects match your filters.'}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
