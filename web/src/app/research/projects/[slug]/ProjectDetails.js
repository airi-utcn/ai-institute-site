'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Markdown from 'markdown-to-jsx';
import {
  FaArrowLeft,
  FaUsers,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaFileAlt,
  FaMapMarkerAlt,
  FaChartLine,
  FaHandshake,
  FaLightbulb,
  FaDatabase,
  FaUserTie,
  FaBookOpen,
  FaFilePdf
} from 'react-icons/fa';
import { containerVariants, itemVariants } from '@/lib/animations';

// Helper to get person path
function getPersonPath(person) {
  const slug = person?.slug ? encodeURIComponent(person.slug) : '';
  if (!slug) return '/people';
  return `/people/${slug}`;
}

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

// Person Card Component
function PersonCard({ person, role }) {
  const portraitUrl = person?.image || null;

  return (
    <Link href={getPersonPath(person)}>
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-4 flex items-center gap-4 group cursor-pointer"
      >
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {portraitUrl ? (
            <img
              src={portraitUrl}
              alt={person.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <FaUsers className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {person.name}
          </h4>
          {role && (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {role}
            </p>
          )}
          {person.title && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {person.title}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// Partner Card Component
function PartnerCard({ partner }) {
  const logoUrl = partner?.logo || null;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center justify-center"
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={partner.name}
          className="object-contain max-h-12 max-w-[120px]"
        />
      ) : (
        <span className="text-gray-600 dark:text-gray-400 font-medium text-center">
          {partner.name}
        </span>
      )}
    </motion.div>
  );
}

// Info Card Component
function InfoCard({ icon: Icon, label, value, href }) {
  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center gap-3">
      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="font-semibold text-gray-900 dark:text-white">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:scale-105 transition-transform">
        {content}
      </Link>
    );
  }

  return content;
}

// Dataset Card Component
function DatasetCard({ dataset }) {
  return (
    <motion.a
      href={dataset.source_url}
      target="_blank"
      rel="noopener noreferrer"
      variants={itemVariants}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
          <FaDatabase className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            {dataset.title}
          </h4>
          {dataset.platform && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Platform: {dataset.platform}
            </p>
          )}
        </div>
        <FaExternalLinkAlt className="w-4 h-4 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors flex-shrink-0" />
      </div>
    </motion.a>
  );
}

// Publication Card Component
function PublicationCard({ publication }) {
  const slug = publication.slug ? encodeURIComponent(publication.slug) : '';

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0 mt-0.5">
          <FaBookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-semibold text-gray-900 dark:text-white leading-snug">
            {slug ? (
              <Link
                href={`/research/publications/${slug}`}
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {publication.title}
              </Link>
            ) : (
              publication.title
            )}
          </h4>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {publication.year && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {publication.year}
              </span>
            )}
            {publication.kind && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {publication.kind}
              </span>
            )}
            {publication.domain && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                {publication.domain}
              </span>
            )}
          </div>

          {/* Authors */}
          {publication.authors && publication.authors.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2.5 leading-relaxed">
              <span className="font-medium text-gray-600 dark:text-gray-300">Authors:</span>{' '}
              {publication.authors.join(', ')}
            </p>
          )}

          {/* Description */}
          {publication.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
              {publication.description}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {slug && (
              <Link
                href={`/research/publications/${slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                View details
                <FaExternalLinkAlt className="w-3 h-3" />
              </Link>
            )}
            {publication.pdfFile?.url && (
              <a
                href={publication.pdfFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <FaFilePdf className="w-3.5 h-3.5" />
                PDF
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ProjectDetails({ project }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Project not found</p>
      </div>
    );
  }

  const heroImageUrl = project.heroImage || null;
  const leadPerson = project.leadDetails || null;
  const leadSlug = leadPerson?.slug || project.leadSlug || '';
  const leadName = leadPerson?.name || project.leadName || project.lead || '';
  const themes = (project.themesData && project.themesData.length > 0)
    ? project.themesData
    : (project.themes || []).map((name) => ({ name, slug: '' }));
  const partners = (project.partnersData && project.partnersData.length > 0)
    ? project.partnersData
    : (project.partners || []).map((name) => ({ name, slug: '' }));
  
  const renderMarkdown = (markdown, key) => {
    if (!markdown) return null;
    const content = typeof markdown === 'string' ? markdown : String(markdown);
    return (
      <div
        key={key}
        className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 [&_a]:text-blue-600 dark:[&_a]:text-blue-400 hover:[&_a]:underline"
      >
        <Markdown
          options={{
            overrides: {
              img: {
                component: (props) => (
                  <img {...props} className="rounded-xl shadow-md my-4 max-w-full h-auto" />
                ),
              },
              a: {
                component: (props) => (
                  <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline break-words" target="_blank" rel="noopener noreferrer" />
                ),
              },
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    );
  };

  const isSameMember = (a, b) => {
    if (!a || !b) return false;
    if (a.slug && b.slug) return a.slug === b.slug;
    if (a.id && b.id) return a.id === b.id;
    if (a.name && b.name) return a.name === b.name;
    return false;
  };

  // Combine lead and team members
  const allTeam = [];
  if (leadPerson) {
    allTeam.push({ ...leadPerson, role: 'Project Lead' });
  }
  if (project.team && project.team.length > 0) {
    project.team.forEach(member => {
      if (!member.person) return;
      if (leadSlug && member.person.slug === leadSlug) return;
      allTeam.push({ ...member.person, role: member.role || 'Team Member' });
    });
  }
  if (project.members && project.members.length > 0) {
    project.members.forEach(member => {
      if (leadSlug && member.slug === leadSlug) return;
      if (!allTeam.find(t => isSameMember(t, member))) {
        allTeam.push({ ...member, role: 'Team Member' });
      }
    });
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaInfoCircle },
    { id: 'team', label: 'Team', icon: FaUsers, count: allTeam.length },
  ];

  // Add datasets tab if there are datasets
  if (project.datasets && project.datasets.length > 0) {
    tabs.push({ id: 'datasets', label: 'Datasets', icon: FaDatabase, count: project.datasets.length });
  }

  // Add publications tab if there are publications
  if (project.publications && project.publications.length > 0) {
    tabs.push({ id: 'publications', label: 'Publications', icon: FaBookOpen, count: project.publications.length });
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-blue-600 to-blue-800">
        {heroImageUrl && (
          <img
            src={heroImageUrl}
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            <Link
              href="/research/projects"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              <span>Back to Projects</span>
            </Link>
            <motion.h1
              variants={itemVariants}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              {project.title}
            </motion.h1>
            {themes && themes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {themes.map(theme => (
                  theme.slug ? (
                    <Link
                      key={theme.slug}
                      href={`/research/themes/${theme.slug}`}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white hover:bg-white/30 transition-colors"
                    >
                      {theme.name}
                    </Link>
                  ) : (
                    <span
                      key={theme.name}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white"
                    >
                      {theme.name}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Info Cards */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-12 mb-8 relative z-10"
        >
          {leadName && (
            <InfoCard
              icon={FaUserTie}
              label="Lead"
              value={leadName}
              href={leadPerson?.slug ? getPersonPath(leadPerson) : undefined}
            />
          )}
          {project.region && (
            <InfoCard icon={FaMapMarkerAlt} label="Region" value={project.region} />
          )}
          {project.phase && (
            <InfoCard icon={FaChartLine} label="Phase" value={project.phase} />
          )}
          {project.partners && project.partners.length > 0 && (
            <InfoCard
              icon={FaHandshake}
              label="Partners"
              value={`${project.partners.length} partner${project.partners.length > 1 ? 's' : ''}`}
            />
          )}
        </motion.div>

        {/* External Links */}
        {(project.officialUrl || project.docUrl) && (
          <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-8">
            {project.officialUrl && (
              <a
                href={project.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaExternalLinkAlt className="w-4 h-4" />
                <span>Official Website</span>
              </a>
            )}
            {project.docUrl && (
              <a
                href={project.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaFileAlt className="w-4 h-4" />
                <span>Documentation</span>
              </a>
            )}
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-8">
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              label={tab.label}
              count={tab.count}
            />
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-8"
            >
              {/* Abstract */}
              {project.abstract && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FaLightbulb className="text-yellow-500" />
                    Abstract
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {project.abstract}
                  </p>
                </motion.div>
              )}

              {/* Body Content */}
              {project.body && project.body.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                >
                  {project.body.map((block, index) => {
                    if (block.__component === 'shared.rich-text') {
                      return renderMarkdown(block.body, `rich-${index}`);
                    }
                    if (block.__component === 'shared.section') {
                      return (
                        <div key={`section-${index}`} className="mb-6 last:mb-0">
                          {block.heading && (
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                              {block.heading}
                            </h3>
                          )}
                          {block.subheading && (
                            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {block.subheading}
                            </h4>
                          )}
                          {renderMarkdown(block.body, `section-${index}`)}
                        </div>
                      );
                    }
                    return null;
                  })}
                </motion.div>
              )}

              {/* Domains / Research Themes */}
              {project.domains && project.domains.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Research Domains
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {project.domains.map(domain => (
                      <Link
                        key={domain.slug}
                        href={`/research/themes/${domain.slug}`}
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {domain.name}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Partners */}
              {partners && partners.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FaHandshake className="text-blue-600" />
                    Partners
                  </h2>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                  >
                    {partners.map(partner => (
                      <PartnerCard key={partner.slug || partner.name} partner={partner} />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              {allTeam.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                  {allTeam.map((person, index) => (
                    <PersonCard key={person.slug || index} person={person} role={person.role} />
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <FaUsers className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No team members listed for this project.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'datasets' && (
            <div className="space-y-6">
              {project.datasets && project.datasets.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="grid gap-4 md:grid-cols-2"
                >
                  {project.datasets.map((dataset, index) => (
                    <DatasetCard key={dataset.slug || index} dataset={dataset} />
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <FaDatabase className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No datasets available for this project.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'publications' && (
            <div className="space-y-6">
              {project.publications && project.publications.length > 0 ? (
                <>
                  {/* Group publications by year */}
                  {(() => {
                    const sorted = [...project.publications].sort((a, b) => (b.year || 0) - (a.year || 0));
                    const grouped = sorted.reduce((acc, pub) => {
                      const key = pub.year || 'Other';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(pub);
                      return acc;
                    }, {});

                    return Object.entries(grouped).map(([year, pubs]) => (
                      <div key={year}>
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {year}
                          </h3>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {pubs.length} publication{pubs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          variants={containerVariants}
                          className="grid gap-4"
                        >
                          {pubs.map((pub, index) => (
                            <PublicationCard key={pub.slug || pub.id || index} publication={pub} />
                          ))}
                        </motion.div>
                      </div>
                    ));
                  })()}
                </>
              ) : (
                <div className="text-center py-12">
                  <FaBookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No publications available for this project.
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
