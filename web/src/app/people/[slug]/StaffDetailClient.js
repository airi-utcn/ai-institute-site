'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaBook,
  FaUsers,
  FaSearch,
  FaTimes,
  FaCalendarAlt,
  FaTag,
  FaExternalLinkAlt,
  FaFileAlt,
  FaGlobe,
  FaStar,
  FaProjectDiagram,
  FaBuilding,
  FaUserCog
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

// Team Card Component
const PHASE_STYLES = {
  ongoing:   'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  planned:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
  completed: 'bg-gray-100   dark:bg-gray-700      text-gray-600   dark:text-gray-300',
  archived:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

function TeamCard({ team }) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
        team.isLead
          ? 'bg-gradient-to-b from-yellow-400 to-orange-400'
          : 'bg-gradient-to-b from-blue-500 to-indigo-500'
      }`} />

      <div className="pl-5 pr-5 pt-5 pb-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${
              team.isLead
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            }`}>
              <FaUsers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug truncate">
              {team.name}
            </h3>
          </div>
          {team.isLead && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full shrink-0">
              <FaStar className="w-2.5 h-2.5" />
              Lead
            </span>
          )}
        </div>

        {/* Role */}
        {team.role && (
          <div className="flex items-center gap-2">
            <FaUserCog className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{team.role}</span>
          </div>
        )}

        {/* Department */}
        {team.department && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FaBuilding className="w-3.5 h-3.5 shrink-0" />
            {team.department.slug ? (
              <Link
                href={`/research/departments/${encodeURIComponent(team.department.slug)}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
              >
                {team.department.name}
              </Link>
            ) : (
              <span className="truncate">{team.department.name}</span>
            )}
          </div>
        )}

        {/* Description */}
        {team.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {team.description}
          </p>
        )}

        {/* Projects */}
        {team.projects && team.projects.length > 0 && (
          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 mb-2">
              <FaProjectDiagram className="w-3 h-3 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Projects
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {team.projects.map((p) => {
                const phaseClass = PHASE_STYLES[p.phase] || PHASE_STYLES.planned;
                return p.slug ? (
                  <Link
                    key={p.slug}
                    href={`/research/projects/${encodeURIComponent(p.slug)}`}
                    className="group inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors font-medium"
                  >
                    {p.title}
                    {p.phase && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${phaseClass}`}>
                        {p.phase}
                      </span>
                    )}
                  </Link>
                ) : (
                  <span
                    key={p.title}
                    className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                  >
                    {p.title}
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
  
export default function StaffDetailClient({ person, publications, teams, slug }) {
  const [activeTab, setActiveTab] = useState('publications');
  
  // Publications filters
  const [pubQuery, setPubQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');

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
  const hasActiveFilters = pubQuery || yearFilter || kindFilter || domainFilter;

  const clearFilters = () => {
    setPubQuery('');
    setYearFilter('');
    setKindFilter('');
    setDomainFilter('');
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
          active={activeTab === 'teams'}
          onClick={() => setActiveTab('teams')}
          icon={FaUsers}
          label="Teams"
          count={teams.length}
        />
      </motion.div>

      {/* Filters — only relevant for publications tab */}
      {activeTab === 'publications' && (
        <motion.div
          variants={itemVariants}
          className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={pubQuery}
                onChange={(e) => setPubQuery(e.target.value)}
                placeholder="Search publications..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
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
      )}

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
            {teams.length > 0 ? (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="grid gap-4 md:grid-cols-2"
              >
                {teams.map((team, i) => (
                  <TeamCard key={team.slug || i} team={team} />
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <FaUsers className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Not currently assigned to any teams.
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
