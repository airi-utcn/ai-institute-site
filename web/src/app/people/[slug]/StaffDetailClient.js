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
  FaDatabase,
  FaStar,
  FaProjectDiagram,
  FaBuilding,
  FaUserCog,
  FaUser
} from 'react-icons/fa';
import { toPublicationSlug } from '@/lib/slug';
import { getPublicationSourceLabel, normalizePublicationSourceKind } from '@/lib/publication';
import { containerVariants, itemVariants } from '@/lib/animations';
import RichMarkdown from '@/components/shared/RichMarkdown';
import ExpandableMarkdown from '@/components/shared/ExpandableMarkdown';

const DEFAULT_TEXTS = {
  about: 'About',
  publications: 'Publications',
  teams: 'Teams',
  searchPubs: 'Search publications by title, year, domain...',
  allYears: 'All Years',
  allTypes: 'All Types',
  allDomains: 'All Domains',
  clear: 'Clear filters',
  noPubs: 'No publications available yet.',
  noPubsMatch: 'No publications found matching your filters.',
  noTeams: 'No research teams or projects found.',
  viewDetails: 'View Details',
  pdf: 'PDF',
  lead: 'Team Lead',
  projects: 'Projects',
};

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
function PublicationCard({ publication, t }) {
  const publicationSlug = toPublicationSlug(publication);
  const publicationSource = getPublicationSourceLabel(publication.sourceKind, publication.openAlexId);
  
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
            {publication.sourceKind && (
              <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                {publicationSource}
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
            {t('viewDetails')}
          </Link>
        )}
        {publication.pdfFile?.url && (
          <a
            href={publication.pdfFile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <FaExternalLinkAlt className="w-3 h-3" />
            {t('pdf')}
          </a>
        )}
        {publication.doi && (
          <a
            href={`https://doi.org/${publication.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <FaExternalLinkAlt className="w-3 h-3" />
            DOI
          </a>
        )}
        {publication.url && !publication.doi && (
          <a
            href={publication.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <FaExternalLinkAlt className="w-3 h-3" />
            Link
          </a>
        )}
      </div>
    </motion.div>
  );
}

// Team Card Component
function TeamCard({ team, t }) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {team.name}
            </h3>
            {team.isLead && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full font-medium">
                {t('lead')}
              </span>
            )}
          </div>
          {team.role && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {team.role}
            </p>
          )}
        </div>
        {team.type && (
          <span className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
            {team.type}
          </span>
        )}
      </div>

      {team.department && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <FaBuilding className="w-3 h-3 text-gray-400" />
          {team.department.slug ? (
            <Link
              href={`/research/departments/${encodeURIComponent(team.department.slug)}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {team.department.name}
            </Link>
          ) : (
            <span>{team.department.name}</span>
          )}
        </div>
      )}

      {team.description && (
        <ExpandableMarkdown
          content={team.description}
          className="text-xs text-gray-600 dark:text-gray-400 mb-3"
          clampLines={2}
        />
      )}

      {/* Projects */}
      {team.projects && team.projects.length > 0 && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            <FaProjectDiagram className="w-3 h-3 text-blue-500" />
            <span>{t('projects')} ({team.projects.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {team.projects.map((p, idx) => (
              <span key={p.id || idx}>
                {p.slug ? (
                  <Link
                    href={`/research/projects/${encodeURIComponent(p.slug)}`}
                    className="inline-block text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    {p.title}
                  </Link>
                ) : (
                  <span className="inline-block text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    {p.title}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
  
export default function StaffDetailClient({ person, publications, teams, slug }) {
  const t = (k) => DEFAULT_TEXTS[k] || k;
  const tr = (key, fallback) => DEFAULT_TEXTS[key] || fallback;
  
  const [activeTab, setActiveTab] = useState(() => {
    if (person?.bioMarkdown) return 'about';
    if (publications?.length > 0) return 'publications';
    if (teams?.length > 0) return 'teams';
    return 'publications'; // default fallback
  });

  // Publications filters
  const [pubQuery, setPubQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Publications processing
  const { yearOptions, kindOptions, pubDomainOptions, sourceOptions } = useMemo(() => {
    const years = [...new Set(publications.map((p) => p.year).filter((y) => y !== null))].sort((a, b) => b - a);
    const kinds = [...new Set(publications.map((p) => p.kind).filter(Boolean))];
    const domains = [...new Set(publications.map((p) => p.domain).filter(Boolean))];
    const sources = [...new Set(
      publications.map((p) => getPublicationSourceLabel(p.sourceKind, p.openAlexId))
    )];
    return { yearOptions: years, kindOptions: kinds, pubDomainOptions: domains, sourceOptions: sources };
  }, [publications]);

  const filteredPubs = useMemo(() => {
    const q = pubQuery.trim().toLowerCase();
    return publications.filter((p) => {
      const searchable = `${p.title || ''} ${p.year || ''} ${p.domain || ''} ${p.kind || ''} ${p.description || ''}`.toLowerCase();
      const matchesSearch = !q || searchable.includes(q);
      const matchesYear = !yearFilter || String(p.year) === String(yearFilter);
      const matchesKind = !kindFilter || p.kind === kindFilter;
      const matchesDomain = !domainFilter || p.domain === domainFilter;
      const pSourceLabel = getPublicationSourceLabel(p.sourceKind, p.openAlexId);
      const matchesSource = !sourceFilter || pSourceLabel === sourceFilter;
      return matchesSearch && matchesYear && matchesKind && matchesDomain && matchesSource;
    });
  }, [publications, pubQuery, yearFilter, kindFilter, domainFilter, sourceFilter]);

  const clearFilters = () => {
    setPubQuery('');
    setYearFilter('');
    setKindFilter('');
    setDomainFilter('');
    setSourceFilter('');
  };

  const hasActiveFilters = pubQuery || yearFilter || kindFilter || domainFilter || sourceFilter;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2 mb-8">
        {person?.bioMarkdown && (
          <TabButton
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
            icon={FaUser}
            label={tr('about', 'About')}
          />
        )}
        <TabButton
          active={activeTab === 'publications'}
          onClick={() => setActiveTab('publications')}
          icon={FaBook}
          label={t('publications')}
          count={publications.length}
        />
        <TabButton
          active={activeTab === 'teams'}
          onClick={() => setActiveTab('teams')}
          icon={FaUsers}
          label={t('teams')}
          count={teams.length}
        />
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={itemVariants}>
        {activeTab === 'about' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {tr('about', 'About')} {person?.name || ''}
            </h2>
            <RichMarkdown
              content={person.bioMarkdown}
              className="text-gray-700 dark:text-gray-300 leading-relaxed prose dark:prose-invert max-w-none"
            />
          </div>
        ) : activeTab === 'publications' ? (
          <div>
            {/* Publications Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {/* Search */}
                <div className="relative lg:col-span-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={pubQuery}
                    onChange={(e) => setPubQuery(e.target.value)}
                    placeholder={t('searchPubs')}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Year Filter */}
                <FilterDropdown
                  value={yearFilter}
                  onChange={setYearFilter}
                  options={yearOptions}
                  placeholder={t('allYears')}
                  icon={FaCalendarAlt}
                />

                {/* Type/Kind Filter */}
                <FilterDropdown
                  value={kindFilter}
                  onChange={setKindFilter}
                  options={kindOptions}
                  placeholder={t('allTypes')}
                  icon={FaTag}
                />

                {/* Domain Filter */}
                <FilterDropdown
                  value={domainFilter}
                  onChange={setDomainFilter}
                  options={pubDomainOptions}
                  placeholder={t('allDomains')}
                  icon={FaGlobe}
                />

                {/* Source Filter */}
                {sourceOptions.length > 1 && (
                  <FilterDropdown
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    options={sourceOptions}
                    placeholder="All Sources"
                    icon={FaDatabase}
                  />
                )}
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Showing {filteredPubs.length} of {publications.length} publications
                  </span>
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <FaTimes className="w-3 h-3" />
                    <span>{t('clear')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Publications List */}
            {filteredPubs.length > 0 ? (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="grid gap-4 md:grid-cols-2"
              >
                {filteredPubs.map((pub, i) => (
                  <PublicationCard key={pub.slug || i} publication={pub} t={t} />
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <FaBook className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {publications.length === 0 
                    ? t('noPubs')
                    : t('noPubsMatch')}
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
                  <TeamCard key={team.slug || i} team={team} t={t} />
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <FaUsers className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('noTeams')}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
