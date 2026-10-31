'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUsers,
  FaGraduationCap,
  FaIndustry,
  FaSchool,
  FaHandshake,
  FaSearch,
  FaTimes,
  FaExternalLinkAlt,
  FaGlobe,
  FaProjectDiagram,
  FaUserGraduate,
  FaMapMarkerAlt,
  FaArrowRight,
  FaCrown,
  FaGem,
  FaAward,
  FaMedal,
  FaHistory
} from 'react-icons/fa';
import { useEffect } from 'react';
import PartnerRoleBadge, { getPartnerRoleConfig } from '@/components/PartnerRoleBadge';
import { PARTNER_ROLES, PARTNER_ROLE_ORDER } from '@/lib/strapi';
import { containerVariants, itemVariants } from '@/lib/animations';
import DynamicZone from '@/components/shared/DynamicZone';

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
        active
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

function SubTab({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-full transition-all ${
        active
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );
}

function FeatureCard({ icon: Icon, title, desc, href }) {
  const content = (
    <motion.div
      variants={itemVariants}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 ${href ? 'hover:shadow-lg cursor-pointer group' : ''} transition-all duration-300`}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
            <Icon className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${href ? 'group-hover:scale-110' : ''} transition-transform`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-gray-900 dark:text-white ${href ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''} transition-colors`}>
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {desc}
          </p>
        </div>
        {href && (
          <FaExternalLinkAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );

  if (href) {
    if (href.startsWith('http')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function SectionCard({ title, children }) {
  return (
    <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </motion.div>
  );
}


// ============================================================================
// CONTENT SECTIONS
// ============================================================================

// fallback content when strapi is unreachable or blocks are not set
const DEFAULT_PUBLIC_BLOCKS = [
  {
    __component: 'shared.cta',
    title: 'Public Engagement',
    description: 'We actively engage with the public to demystify AI, showcase our research, and share our latest findings with the community.',
    primaryButtonText: 'News & Events',
    primaryButtonUrl: '/news&events/news',
    secondaryButtonText: 'Media Gallery',
    secondaryButtonUrl: '/media',
    theme: 'gradient',
  },
  {
    __component: 'shared.card-grid',
    columns: '3',
    cards: [
      {
        icon: 'users',
        title: 'Community Outreach',
        description: 'Organizing open days, public lectures, and interactive demonstrations to bring AI closer to society.',
      },
      {
        icon: 'book',
        title: 'Educational Content',
        description: 'Creating accessible materials, blogs, and presentations explaining core AI concepts.',
      },
      {
        icon: 'newspaper',
        title: 'Media & Press',
        description: 'Sharing press releases, media appearances, and photo albums from our events and milestones.',
        linkUrl: '/media',
        linkText: 'View Media Gallery',
      },
    ],
  },
];

function PublicContent({ blocks }) {
  // if strapi blocks are missing, use default fallback content
  const content = Array.isArray(blocks) && blocks.length > 0 ? blocks : DEFAULT_PUBLIC_BLOCKS;
  return (
    <div className="space-y-6">
      <DynamicZone blocks={content} />
      {/* link to media gallery from public engagement */}
      <motion.div variants={itemVariants} className="flex items-center justify-end pt-2">
        <Link
          href="/media"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span>Explore AIRi Media Gallery (photos, press & brochure)</span>
          <FaArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    </div>
  );
}

function AcademicContent({ blocks }) {
  return <DynamicZone blocks={blocks} />;
}

function IndustryContent({
  projects,
  infoBlocks,
  infoLabel,
  projectsLabel,
  searchPlaceholder,
  allDomainsLabel,
  leadLabel,
  noProjectsLabel,
  clearFiltersLabel,
  subTab,
  setSubTab,
}) {
  const INDUSTRY_SUBTABS = [
    { id: 'info', label: infoLabel || 'Info' },
    { id: 'projects', label: projectsLabel || 'Projects' },
  ];

  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('');

  const industryProjects = useMemo(() => {
    return projects.filter(p => p.isIndustryEngagement);
  }, [projects]);

  const domainOptions = useMemo(() => {
    const domains = new Set();
    industryProjects.forEach(p => {
      (p.domains || []).forEach(d => d && domains.add(d));
    });
    return Array.from(domains).sort();
  }, [industryProjects]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return industryProjects.filter(p => {
      const haystack = [p.title, p.abstract, p.lead, ...(p.domains || [])].join(' ').toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesDomain = !domainFilter || (p.domains || []).includes(domainFilter);
      return matchesQuery && matchesDomain;
    });
  }, [industryProjects, query, domainFilter]);

  return (
    <div className="space-y-6">
      {/* Subtabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {INDUSTRY_SUBTABS.map(tab => (
          <SubTab
            key={tab.id}
            active={subTab === tab.id}
            onClick={() => setSubTab(tab.id)}
            label={tab.label}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
          className="space-y-6"
        >
          {subTab === 'info' && (
            <DynamicZone blocks={infoBlocks} />
          )}
          {subTab === 'projects' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder || 'Search industry projects...'}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{allDomainsLabel || 'All domains'}</option>
                  {domainOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Projects List */}
              {filteredProjects.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredProjects.map((p, i) => (
                    <motion.div
                      key={p.slug || i}
                      variants={itemVariants}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-shadow"
                    >
                      <div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(p.domains || []).map(d => (
                            <span
                              key={d}
                              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {p.title}
                        </h3>
                        {p.abstract && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {p.abstract}
                          </p>
                        )}
                        {p.partners && p.partners.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Partners: </span>
                            {p.partners.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 text-xs">
                        {p.lead && (
                          <span className="text-gray-500">
                        {leadLabel || 'Lead:'} {p.lead}
                          </span>
                        )}
                        {p.slug && (
                          <Link
                            href={`/research/projects/${p.slug}`}
                            className="text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
                          >
                            Details →
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                  <p className="text-gray-500 dark:text-gray-400">{noProjectsLabel || 'No industry projects found.'}</p>
                  {(query || domainFilter) && (
                    <button
                      onClick={() => { setQuery(''); setDomainFilter(''); }}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {clearFiltersLabel || 'Clear filters'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HighSchoolContent({ blocks }) {
  return <DynamicZone blocks={blocks} />;
}

// sponsorship tiers defined in hierarchical order
// clean bold titles with icons and partner counts, avoiding corny corporate marketing filler
const PARTNER_TIERS = [
  {
    id: 'Strategic',
    title: 'Strategic Partners',
    icon: FaCrown,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-300 dark:border-red-800',
  },
  {
    id: 'Diamond',
    title: 'Diamond Partners',
    icon: FaGem,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-300 dark:border-sky-800',
  },
  {
    id: 'Platinum',
    title: 'Platinum Partners',
    icon: FaAward,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-300 dark:border-indigo-800',
  },
  {
    id: 'Gold',
    title: 'Gold Partners',
    icon: FaMedal,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-800',
  },
  {
    id: 'Partner',
    title: 'Collaborating Partners',
    icon: FaHandshake,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-800',
  },
];

// partner card component
// handles active vs past project lists cleanly so expired projects don't look active
function PartnerCard({
  partner,
  isProminent = false,
  activeProjectsLabel,
  exploreProfileLabel,
  visitWebsiteLabel,
  statusCurrentLabel,
  statusFormerLabel,
}) {
  const roleConfig = getPartnerRoleConfig(partner.role);

  // filter active vs past projects
  // directly fixes issue 172 where za cloud had its expired distributed ledger project under active projects
  const activeProjs = Array.isArray(partner.activeProjects)
    ? partner.activeProjects
    : (partner.projects || []).filter((pr) => !pr.isArchived);
  const pastProjs = Array.isArray(partner.pastProjects)
    ? partner.pastProjects
    : (partner.projects || []).filter((pr) => pr.isArchived);

  return (
    <motion.article
      variants={itemVariants}
      className={`group flex flex-col rounded-3xl border-2 ${roleConfig.cardBorder} bg-white p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-[#0a0a0a] relative overflow-hidden ${
        isProminent ? 'shadow-md dark:shadow-sky-950/20' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-6 relative z-10 h-full">
        {/* partner logo */}
        {partner.logo ? (
          <div
            className={`shrink-0 ${
              isProminent ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-20 w-20 sm:h-24 sm:w-24'
            } rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 dark:bg-gray-900 dark:border-gray-800 transition-colors group-hover:bg-white dark:group-hover:bg-black p-2 flex items-center justify-center`}
          >
            <img
              src={partner.logo}
              alt={partner.logoAlt || partner.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div
            className={`shrink-0 flex items-center justify-center ${
              isProminent ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-20 w-20 sm:h-24 sm:w-24'
            } rounded-2xl bg-gray-50 border border-gray-100 dark:bg-gray-900 dark:border-gray-800 text-gray-400 font-bold text-2xl`}
          >
            {partner.name.charAt(0)}
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0">
          {/* partner title and badges */}
          <div className="flex justify-between items-start gap-4 mb-3">
            <div className="min-w-0">
              {partner.slug ? (
                <Link
                  href={`/engagement/partners/${encodeURIComponent(partner.slug)}`}
                  className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2"
                >
                  {partner.name}
                </Link>
              ) : (
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white line-clamp-2">
                  {partner.name}
                </h3>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <PartnerRoleBadge role={partner.role} size="xs" />
                {partner.country ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <FaMapMarkerAlt className="w-3.5 h-3.5" />
                    {partner.country}
                  </span>
                ) : null}

                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                    partner.partnerStatus === 'current'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {partner.partnerStatus === 'current'
                    ? statusCurrentLabel || 'Current'
                    : statusFormerLabel || 'Former'}
                </span>
              </div>
            </div>
          </div>

          {/* short description */}
          {partner.description && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {partner.description}
            </p>
          )}

          {/* project listings */}
          <div className="flex-1 mt-4 space-y-3">
            {/* active projects */}
            {activeProjs.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FaProjectDiagram className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {activeProjectsLabel || 'Active Projects'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeProjs.slice(0, 3).map((project) => (
                    <Link
                      key={project.slug || project.title}
                      href={project.slug ? `/research/projects/${encodeURIComponent(project.slug)}` : '/research/projects'}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:border-emerald-400 transition-colors"
                    >
                      {project.title}
                    </Link>
                  ))}
                  {activeProjs.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500">
                      +{activeProjs.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* past projects - shown with distinct historical styling */}
            {pastProjs.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <FaHistory className="w-3 h-3 text-gray-400" />
                  Past Collaborations
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {pastProjs.slice(0, 2).map((project) => (
                    <Link
                      key={project.slug || project.title}
                      href={project.slug ? `/research/projects/${encodeURIComponent(project.slug)}` : '/research/projects'}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {project.title}
                    </Link>
                  ))}
                  {pastProjs.length > 2 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500">
                      +{pastProjs.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* actions */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
            {partner.slug ? (
              <Link
                href={`/engagement/partners/${encodeURIComponent(partner.slug)}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-black dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-all group/btn"
              >
                {exploreProfileLabel || 'Explore Profile'}
                <FaArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            ) : <span />}

            {partner.url ? (
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 w-10 h-10 justify-center rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={visitWebsiteLabel || 'Visit website'}
              >
                <FaExternalLinkAlt className="w-3.5 h-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function PartnersContent({
  partners,
  CollaboratorsClient,
  title,
  mapTitle,
  eyebrow,
  description,
  statsPartners,
  statsCountries,
  statsProjects,
  searchPlaceholder,
  allCountries,
  currentPartners,
  formerPartners,
  allStatuses,
  allRoles,
  clearFilters,
  statusCurrent,
  statusFormer,
  activeProjects,
  exploreProfile,
  visitWebsite,
  emptyFiltered,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // read view param from url to support direct links like ?tab=partners&view=previous
  // inspired by formula student partner history tab toggle
  const viewParam = searchParams.get('view');
  const [view, setViewState] = useState(viewParam === 'previous' ? 'previous' : 'current');

  // keep view in sync with url
  useEffect(() => {
    if (viewParam === 'previous') {
      setViewState('previous');
    } else {
      setViewState('current');
    }
  }, [viewParam]);

  const handleViewChange = (newView) => {
    setViewState(newView);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'partners');
    if (newView === 'previous') {
      params.set('view', 'previous');
    } else {
      params.delete('view');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const partnerList = useMemo(() => (Array.isArray(partners) ? partners : []), [partners]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // partition partners into current (has active projects) and former (no active projects)
  // per issue 172: "If a partner does not have an active project - it should appear in a Previous Partners page"
  const currentPartnersList = useMemo(
    () => partnerList.filter((p) => p.partnerStatus === 'current' || p.isCurrentPartner),
    [partnerList]
  );
  const formerPartnersList = useMemo(
    () => partnerList.filter((p) => p.partnerStatus === 'former' || p.isFormer),
    [partnerList]
  );

  // current active dataset depending on which tab view the user is on
  const activeDataset = view === 'previous' ? formerPartnersList : currentPartnersList;

  // collect unique countries for dropdown
  const countryOptions = useMemo(() => {
    const countries = new Set();
    partnerList.forEach((partner) => {
      if (partner?.country) {
        countries.add(partner.country.trim());
      }
    });
    return Array.from(countries).sort((a, b) => a.localeCompare(b));
  }, [partnerList]);

  // filter partners by search text, country, and role
  const filteredPartners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeDataset.filter((partner) => {
      const haystack = [
        partner?.name,
        partner?.country,
        partner?.role,
        partner?.description,
        partner?.descriptionMarkdown,
        ...(Array.isArray(partner?.projects) ? partner.projects.map((project) => project?.title) : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesCountry = !countryFilter || partner?.country === countryFilter;
      const matchesRole = !roleFilter || (partner?.role || 'Partner').toLowerCase() === roleFilter.toLowerCase();
      return matchesQuery && matchesCountry && matchesRole;
    });
  }, [activeDataset, searchQuery, countryFilter, roleFilter]);

  const totalProjects = useMemo(() => {
    return partnerList.reduce(
      (acc, partner) => acc + (Array.isArray(partner?.projects) ? partner.projects.length : 0),
      0
    );
  }, [partnerList]);

  return (
    <motion.div key="partners" variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      {/* hero header card */}
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-[#0a0a0a] text-white dark:bg-white dark:text-[#0a0a0a] py-10 px-8 lg:px-12 flex flex-col md:flex-row md:items-center justify-between gap-10"
      >
        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-white/5 dark:bg-black/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-gray-400 dark:text-gray-500">
            {eyebrow || 'Strategic Network'}
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            {title || 'Partners'}
          </h2>
          <p className="text-lg text-gray-400 dark:text-gray-600 leading-relaxed md:max-w-xl">
            {description || 'We are proud to collaborate with leading organizations across academia and industry.'}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-8 md:gap-12">
          <div className="flex flex-col">
            <span className="text-4xl md:text-5xl font-bold tracking-tighter">{partnerList.length}</span>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">
              {statsPartners || 'Partners'}
            </span>
          </div>
          <div className="w-px h-16 bg-white/10 dark:bg-black/10 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-4xl md:text-5xl font-bold tracking-tighter">{countryOptions.length}</span>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">
              {statsCountries || 'Countries'}
            </span>
          </div>
          <div className="w-px h-16 bg-white/10 dark:bg-black/10 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-4xl md:text-5xl font-bold tracking-tighter">{totalProjects}</span>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">
              {statsProjects || 'Projects'}
            </span>
          </div>
        </div>
      </motion.section>

      {/* view switcher: current partners vs previous partners */}
      {/* mirrors the clear tab navigation seen on formula student partners page */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div
          className="inline-flex p-1.5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 shadow-sm"
          role="tablist"
          aria-label="Partner Directory View"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'current'}
            onClick={() => handleViewChange('current')}
            className={`px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              view === 'current'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <FaUsers className="w-4 h-4" />
            <span>{currentPartners || 'Current Partners'} ({currentPartnersList.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === 'previous'}
            onClick={() => handleViewChange('previous')}
            className={`px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              view === 'previous'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <FaHistory className="w-4 h-4" />
            <span>{formerPartners || 'Previous Partners'} ({formerPartnersList.length})</span>
          </button>
        </div>
      </motion.div>

      {/* search and filter bar */}
      <motion.div variants={itemVariants} className="rounded-2xl p-2 bg-gray-50/80 border border-gray-100 dark:bg-gray-900/50 dark:border-gray-800">
        <div className="flex flex-col md:flex-row gap-2">
          {/* search query */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholder || 'Search by partner, country, project'}
              className="w-full h-12 rounded-xl bg-white pl-11 pr-4 text-sm text-gray-900 border-none shadow-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-[#0a0a0a] dark:text-white transition-shadow"
            />
          </div>

          {/* country dropdown */}
          <select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value)}
            className="h-12 rounded-xl bg-white px-4 text-sm text-gray-900 border-none shadow-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-[#0a0a0a] dark:text-white transition-shadow cursor-pointer min-w-[170px]"
          >
            <option value="">{allCountries || 'All countries'}</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          {/* role filter only relevant in current partners view */}
          {view === 'current' && (
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-12 rounded-xl bg-white px-4 text-sm text-gray-900 border-none shadow-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-[#0a0a0a] dark:text-white transition-shadow cursor-pointer min-w-[150px]"
            >
              <option value="">{allRoles || 'All tiers'}</option>
              {(PARTNER_ROLES || []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {/* clear button */}
          {(searchQuery || countryFilter || roleFilter) ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setCountryFilter('');
                setRoleFilter('');
              }}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors shrink-0"
            >
              <FaTimes className="w-3.5 h-3.5" />
              {clearFilters || 'Clear'}
            </button>
          ) : null}
        </div>
      </motion.div>

      {/* VIEW 1: CURRENT PARTNERS - clearly sectioned by sponsorship tier */}
      {/* issue 172: diamond, gold, platinum partners distinguished with separation line and bold title */}
      {view === 'current' && (
        <div className="space-y-12">
          {filteredPartners.length > 0 ? (
            PARTNER_TIERS.map((tier) => {
              // find partners in this specific tier
              const tierPartners = filteredPartners.filter((p) => {
                const partnerRole = (p.role || 'Partner').toLowerCase();
                return partnerRole === tier.id.toLowerCase();
              });

              // skip empty tiers
              if (tierPartners.length === 0) return null;

              const TierIcon = tier.icon;
              const isProminent = tier.id === 'Strategic' || tier.id === 'Diamond';

              return (
                <section key={tier.id} className="space-y-6">
                  {/* clean tier separation line & bold header */}
                  <div className="flex items-center justify-between border-b-2 border-gray-200 dark:border-gray-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl ${tier.bg} ${tier.color}`}>
                        <TierIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">
                        {tier.title}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {tierPartners.length} {tierPartners.length === 1 ? 'partner' : 'partners'}
                    </span>
                  </div>

                  {/* grid of partner cards */}
                  <div className="grid gap-6 xl:grid-cols-2">
                    {tierPartners.map((partner) => (
                      <PartnerCard
                        key={partner.slug || partner.name}
                        partner={partner}
                        isProminent={isProminent}
                        activeProjectsLabel={activeProjects}
                        exploreProfileLabel={exploreProfile}
                        visitWebsiteLabel={visitWebsite}
                        statusCurrentLabel={statusCurrent}
                        statusFormerLabel={statusFormer}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <motion.div variants={itemVariants} className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
              <FaSearch className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{emptyFiltered || 'No current partners match your filters.'}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* VIEW 2: PREVIOUS PARTNERS */}
      {/* partners with concluded projects or no current active project appear here */}
      {view === 'previous' && (
        <div className="space-y-6">
          {/* informative banner explaining past collaborations */}
          <div className="p-6 rounded-3xl bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm shrink-0">
              <FaHistory className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Previous Partners
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Organizations that previously collaborated with AIRi on completed research projects.
              </p>
            </div>
          </div>

          {filteredPartners.length > 0 ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {filteredPartners.map((partner) => (
                <PartnerCard
                  key={partner.slug || partner.name}
                  partner={partner}
                  isProminent={false}
                  activeProjectsLabel={activeProjects}
                  exploreProfileLabel={exploreProfile}
                  visitWebsiteLabel={visitWebsite}
                  statusCurrentLabel={statusCurrent}
                  statusFormerLabel={statusFormer}
                />
              ))}
            </div>
          ) : (
            <motion.div variants={itemVariants} className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
              <FaSearch className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{emptyFiltered || 'No previous partners match your filters.'}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* map section */}
      {CollaboratorsClient && (
        <motion.div variants={itemVariants} className="pt-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{mapTitle || 'Partner Map'}</h2>
          <CollaboratorsClient partners={partners} />
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EngagementClient({ projects = [], partners = [], CollaboratorsClient, pageData }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get('tab') || 'public';
  const subTab = searchParams.get('sub') || (activeTab === 'industry' ? 'info' : null);

  const heroTitle = pageData?.heroTitle || "Engagement";
  const heroSubtitle = pageData?.heroSubtitle || "Building bridges between research, industry, and society";

  const MAIN_TABS = [
    { id: 'public', label: pageData?.tabPublic || "Public", icon: FaUsers },
    { id: 'academic', label: pageData?.tabAcademic || "Academic", icon: FaGraduationCap },
    { id: 'industry', label: pageData?.tabIndustry || "Industry", icon: FaIndustry },
    { id: 'high-school', label: pageData?.tabHighSchool || "High-School", icon: FaSchool },
    { id: 'partners', label: pageData?.tabPartners || "Partners", icon: FaHandshake },
  ];

  const setTab = useCallback((tab) => {
    router.push(`?tab=${tab}`, { scroll: false });
  }, [router]);

  const setSubTab = useCallback((sub) => {
    router.push(`?tab=${activeTab}&sub=${sub}`, { scroll: false });
  }, [router, activeTab]);

  // Transform projects for industry section
  const transformedProjects = useMemo(() => {
    return projects.map(p => ({
      title: p.title || '',
      slug: p.slug || '',
      abstract: p.abstract || '',
      lead: p.leadName || p.lead || '',
      domains: Array.isArray(p.domain) ? p.domain : (p.domains || []).map(d => d?.name).filter(Boolean),
      partners: Array.isArray(p.partners) ? p.partners.map(x => x?.name || x).filter(Boolean) : [],
      isIndustryEngagement: p.isIndustryEngagement || false,
    }));
  }, [projects]);

  return (
    <motion.div
      key="main-page-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.h1 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-2">
            {heroTitle}
          </motion.h1>
          <motion.p variants={itemVariants} className="text-xl text-blue-100">
            {heroSubtitle}
          </motion.p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Tabs */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap gap-2 mb-8 -mt-12 relative z-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"
        >
          {MAIN_TABS.map(tab => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setTab(tab.id)}
              icon={tab.icon}
              label={tab.label}
            />
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab} // <-- The Main Tab Key
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'public' && (
              <PublicContent blocks={pageData?.publicContent} />
            )}
            {activeTab === 'academic' && <AcademicContent blocks={pageData?.academicContent} />}
            {activeTab === 'industry' && (
              <IndustryContent
                projects={transformedProjects}
                infoBlocks={pageData?.industryContent}
                infoLabel={pageData?.subtabInfo}
                projectsLabel={pageData?.subtabProjects}
                searchPlaceholder={pageData?.industrySearchPlaceholder}
                allDomainsLabel={pageData?.industryAllDomains}
                leadLabel={pageData?.industryLeadLabel}
                noProjectsLabel={pageData?.industryNoProjects}
                clearFiltersLabel={pageData?.industryClearFilters}
                subTab={subTab}
                setSubTab={setSubTab}
              />
            )}
            {activeTab === 'high-school' && <HighSchoolContent blocks={pageData?.highSchoolContent} />}
            {activeTab === 'partners' && (
              <PartnersContent
                partners={partners}
                CollaboratorsClient={CollaboratorsClient}
                title={pageData?.partnersTitle}
                mapTitle={pageData?.partnersMapTitle}
                eyebrow={pageData?.partnersEyebrow}
                description={pageData?.partnersDescription}
                statsPartners={pageData?.partnersStatsPartners}
                statsCountries={pageData?.partnersStatsCountries}
                statsProjects={pageData?.partnersStatsProjects}
                searchPlaceholder={pageData?.partnersSearchPlaceholder}
                allCountries={pageData?.partnersAllCountries}
                currentPartners={pageData?.partnersCurrentPartners}
                formerPartners={pageData?.partnersFormerPartners}
                allStatuses={pageData?.partnersAllStatuses}
                allRoles={pageData?.partnersAllRoles}
                clearFilters={pageData?.partnersClearFilters}
                statusCurrent={pageData?.partnersStatusCurrent}
                statusFormer={pageData?.partnersStatusFormer}
                activeProjects={pageData?.partnersActiveProjects}
                exploreProfile={pageData?.partnersExploreProfile}
                visitWebsite={pageData?.partnersVisitWebsite}
                emptyFiltered={pageData?.partnersEmptyFiltered}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
