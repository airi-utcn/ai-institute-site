'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  FaUsers,
  FaGraduationCap,
  FaIndustry,
  FaSchool,
  FaHandshake,
  FaFlask,
  FaSearch,
  FaTimes,
  FaExternalLinkAlt,
  FaGlobe,
  FaInfoCircle,
  FaProjectDiagram,
  FaBook,
  FaChalkboardTeacher,
  FaPlane,
  FaUserGraduate,
  FaMapMarkerAlt,
  FaArrowRight
} from 'react-icons/fa';
import { containerVariants, itemVariants } from '@/lib/animations';

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

function PublicContent() {
  const t = useTranslations('engagement.basic.PublicContent');
  return (
    <motion.div key="public" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title={t('title')}>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {t('desc')}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/media"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaExternalLinkAlt className="w-4 h-4" />
            {t('btnMedia')}
          </Link>
          <Link
            href="/news&events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('btnNews')}
          </Link>
        </div>
      </SectionCard>

      <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={FaUsers}
          title={t('outreachTitle')}
          desc={t('outreachDesc')}
        />
        <FeatureCard
          icon={FaBook}
          title={t('eduTitle')}
          desc={t('eduDesc')}
        />
        <FeatureCard
          icon={FaGlobe}
          title={t('mediaTitle')}
          desc={t('mediaDesc')}
          href="/media"
        />
      </motion.div>
    </motion.div>
  );
}

function AcademicContent({ subTab, setSubTab }) {
  const tTab = useTranslations('engagement.basic.SubTabs');
  const t = useTranslations('engagement.basic.AcademicContent');

  const ACADEMIC_SUBTABS = [
    { id: 'partnerships', label: tTab('partnerships'), icon: FaHandshake },
    { id: 'teaching', label: tTab('teaching'), icon: FaChalkboardTeacher },
    { id: 'courses', label: tTab('courses'), icon: FaBook },
    { id: 'mobility', label: tTab('mobility'), icon: FaPlane },
  ];

  return (
    <div className="space-y-6">
      {/* Subtabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ACADEMIC_SUBTABS.map(tab => (
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
          {subTab === 'partnerships' && (
            <div className="space-y-6">
              <SectionCard title={t('partnerTitle')}>
                <p className="text-gray-700 dark:text-gray-300">
                  {t('partnerDesc')}
                </p>
              </SectionCard>
              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={FaGraduationCap}
                  title={t('uniTitle')}
                  desc={t('uniDesc')}
                />
                <FeatureCard
                  icon={FaHandshake}
                  title={t('netTitle')}
                  desc={t('netDesc')}
                />
              </div>
            </div>
          )}

          {subTab === 'teaching' && (
            <div className="space-y-6">
              <SectionCard title={t('teachTitle')}>
                <p className="text-gray-700 dark:text-gray-300">
                  {t('teachDesc')}
                </p>
              </SectionCard>
              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={FaChalkboardTeacher}
                  title={t('summerTitle')}
                  desc={t('summerDesc')}
                />
                <FeatureCard
                  icon={FaBook}
                  title={t('workTitle')}
                  desc={t('workDesc')}
                />
              </div>
            </div>
          )}

          {subTab === 'courses' && (
            <div className="space-y-6">
              <SectionCard title={t('courseTitle')}>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {t('courseDesc')}
                </p>
              </SectionCard>
              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={FaFlask}
                  title={t('mlTitle')}
                  desc={t('mlDesc')}
                />
                <FeatureCard
                  icon={FaProjectDiagram}
                  title={t('robotTitle')}
                  desc={t('robotDesc')}
                />
                <FeatureCard
                  icon={FaIndustry}
                  title={t('hpcTitle')}
                  desc={t('hpcDesc')}
                />
                <FeatureCard
                  icon={FaInfoCircle}
                  title={t('ethicsTitle')}
                  desc={t('ethicsDesc')}
                />
              </div>
            </div>
          )}

          {subTab === 'mobility' && (
            <div className="space-y-6">
              <SectionCard title={t('mobTitle')}>
                <p className="text-gray-700 dark:text-gray-300">
                  {t('mobDesc')}
                </p>
              </SectionCard>
              <div className="grid gap-4 md:grid-cols-3">
                <FeatureCard
                  icon={FaUserGraduate}
                  title={t('supTitle')}
                  desc={t('supDesc')}
                />
                <FeatureCard
                  icon={FaPlane}
                  title={t('grantTitle')}
                  desc={t('grantDesc')}
                />
                <FeatureCard
                  icon={FaUsers}
                  title={t('exTitle')}
                  desc={t('exDesc')}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function IndustryContent({ projects, subTab, setSubTab }) {
  const tTab = useTranslations('engagement.basic.SubTabs');
  const t = useTranslations('engagement.basic.IndustryContent');

  const INDUSTRY_SUBTABS = [
    { id: 'overview', label: tTab('overview') },
    { id: 'projects', label: tTab('projects') },
    { id: 'engagement', label: tTab('engagement') },
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

  const stats = useMemo(() => {
    const domains = new Set();
    const partners = new Set();
    industryProjects.forEach(p => {
      (p.domains || []).forEach(d => d && domains.add(d));
      (p.partners || []).forEach(x => x && partners.add(x));
    });
    return {
      projectCount: industryProjects.length,
      domainCount: domains.size,
      partnerCount: partners.size,
    };
  }, [industryProjects]);

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
          {subTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <motion.div variants={itemVariants} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.projectCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('statProjects')}</div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.domainCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('statDomains')}</div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.partnerCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('statPartners')}</div>
                </motion.div>
              </div>

              <SectionCard title={t('collabTitle')}>
                <p className="text-gray-700 dark:text-gray-300">
                  {t('collabDesc')}
                </p>
              </SectionCard>
            </div>
          )}

          {subTab === 'projects' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  />
                </div>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                >
                  <option value="">{t('allDomains')}</option>
                  {domainOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {(query || domainFilter) && (
                  <button
                    onClick={() => { setQuery(''); setDomainFilter(''); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <FaTimes className="w-4 h-4" />
                    {t('clear')}
                  </button>
                )}
              </div>

              {/* Projects Grid */}
              {filteredProjects.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredProjects.map(project => (
                    <motion.div
                      key={project.slug || project.title}
                      variants={itemVariants}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-all"
                    >
                      <Link href={`/research/projects/${project.slug}`} className="block group">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                          {project.title}
                        </h3>
                        {project.lead && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {t('leadLabel')} {project.lead}
                          </p>
                        )}
                        {project.abstract && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {project.abstract}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {(project.domains || []).map((d, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                              {d}
                            </span>
                          ))}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaProjectDiagram className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">{t('noProjects')}</p>
                </div>
              )}
            </div>
          )}

          {subTab === 'engagement' && (
            <div className="space-y-6">
              <SectionCard title={t('workTitle')}>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {t('workDesc')}
                </p>
              </SectionCard>
              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={FaFlask}
                  title={t('rdTitle')}
                  desc={t('rdDesc')}
                />
                <FeatureCard
                  icon={FaChalkboardTeacher}
                  title={t('consTitle')}
                  desc={t('consDesc')}
                />
                <FeatureCard
                  icon={FaUserGraduate}
                  title={t('trainTitle')}
                  desc={t('trainDesc')}
                />
                <FeatureCard
                  icon={FaHandshake}
                  title={t('techTitle')}
                  desc={t('techDesc')}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HighSchoolContent() {
  const t = useTranslations('engagement.basic.HighSchoolContent');
  return (
    <motion.div key="highschool" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title={t('title')}>
        <p className="text-gray-700 dark:text-gray-300">
          {t('desc')}
        </p>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={FaGraduationCap}
          title={t('compTitle')}
          desc={t('compDesc')}
        />
        <FeatureCard
          icon={FaUsers}
          title={t('eventTitle')}
          desc={t('eventDesc')}
        />
        <FeatureCard
          icon={FaBook}
          title={t('eduTitle')}
          desc={t('eduDesc')}
        />
      </div>

      <motion.div variants={itemVariants}>
        <a
          href="https://ailiteracyframework.org/wp-content/uploads/2025/05/AILitFramework_ReviewDraft.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaExternalLinkAlt className="w-4 h-4" />
          {t('btnLabel')}
        </a>
      </motion.div>
    </motion.div>
  );
}

function PartnersContent({ partners, CollaboratorsClient }) {
  const t = useTranslations('engagement.basic.PartnersContent');

  const partnerList = useMemo(() => (Array.isArray(partners) ? partners : []), [partners]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  const countryOptions = useMemo(() => {
    const countries = new Set();
    partnerList.forEach((partner) => {
      if (partner?.country) {
        countries.add(partner.country.trim());
      }
    });
    return Array.from(countries).sort((a, b) => a.localeCompare(b));
  }, [partnerList]);

  const filteredPartners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return partnerList.filter((partner) => {
      const haystack = [
        partner?.name,
        partner?.country,
        partner?.description,
        partner?.descriptionMarkdown,
        ...(Array.isArray(partner?.projects) ? partner.projects.map((project) => project?.title) : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesCountry = !countryFilter || partner?.country === countryFilter;
      return matchesQuery && matchesCountry;
    });
  }, [partnerList, searchQuery, countryFilter]);

  const totalProjects = useMemo(() => {
    return partnerList.reduce((acc, partner) => acc + (Array.isArray(partner?.projects) ? partner.projects.length : 0), 0);
  }, [partnerList]);

  return (
    <motion.div key="partners" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-[#0a0a0a] text-white dark:bg-white dark:text-[#0a0a0a] py-10 px-8 lg:px-12 flex flex-col md:flex-row md:items-center justify-between gap-10"
      >
        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-white/5 dark:bg-black/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-gray-400 dark:text-gray-500">Strategic Network</p>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">{t('title')}</h2>
          <p className="text-lg text-gray-400 dark:text-gray-600 leading-relaxed md:max-w-xl">{t('desc')}</p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-8 md:gap-12">
          <div className="flex flex-col">
            <span className="text-4xl md:text-5xl font-bold tracking-tighter">{partnerList.length}</span>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Partners</span>
          </div>
          <div className="w-px h-16 bg-white/10 dark:bg-black/10 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-4xl md:text-5xl font-bold tracking-tighter">{countryOptions.length}</span>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Countries</span>
          </div>
          <div className="w-px h-16 bg-white/10 dark:bg-black/10 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-4xl md:text-5xl font-bold tracking-tighter">{totalProjects}</span>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Projects</span>
          </div>
        </div>
      </motion.section>

      {partnerList.length > 0 ? (
        <>
          <motion.div variants={itemVariants} className="rounded-2xl p-2 bg-gray-50/80 border border-gray-100 dark:bg-gray-900/50 dark:border-gray-800">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by partner, country, project"
                  className="w-full h-12 rounded-xl bg-white pl-11 pr-4 text-sm text-gray-900 border-none shadow-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-[#0a0a0a] dark:text-white transition-shadow"
                />
              </div>

              <select
                value={countryFilter}
                onChange={(event) => setCountryFilter(event.target.value)}
                className="h-12 rounded-xl bg-white px-4 text-sm text-gray-900 border-none shadow-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-[#0a0a0a] dark:text-white transition-shadow cursor-pointer min-w-[200px]"
              >
                <option value="">All countries</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>

              {(searchQuery || countryFilter) ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCountryFilter('');
                  }}
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors shrink-0"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                  Clear
                </button>
              ) : null}
            </div>
          </motion.div>

          {filteredPartners.length > 0 ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {filteredPartners.map((p) => (
                <motion.article
                  key={p.slug || p.name}
                  variants={itemVariants}
                  className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-gray-200 dark:border-gray-800 dark:bg-[#0a0a0a] dark:hover:border-gray-700 relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row gap-6 relative z-10 h-full">
                    {/* Visual Anchor / Logo */}
                    {p.logo ? (
                      <div className="shrink-0 flex items-center justify-center p-3 h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gray-50 border border-gray-100 dark:bg-gray-900 dark:border-gray-800 transition-colors group-hover:bg-white dark:group-hover:bg-black">
                        <img
                          src={p.logo}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal"
                        />
                      </div>
                    ) : (
                      <div className="shrink-0 flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gray-50 border border-gray-100 dark:bg-gray-900 dark:border-gray-800 text-gray-400 font-bold text-2xl">
                        {p.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex flex-col flex-1 min-w-0">
                      {/* Headers */}
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="min-w-0">
                          {p.slug ? (
                            <Link
                              href={`/engagement/partners/${encodeURIComponent(p.slug)}`}
                              className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2"
                            >
                              {p.name}
                            </Link>
                          ) : (
                            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white line-clamp-2">{p.name}</h3>
                          )}
                          
                          {p.country ? (
                            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <FaMapMarkerAlt className="w-3.5 h-3.5" />
                              {p.country}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex-1 mt-4">
                        {Array.isArray(p.projects) && p.projects.length > 0 ? (
                          <div className="space-y-3">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <FaProjectDiagram className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              Active Projects
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {p.projects.slice(0, 3).map((project) => (
                                <Link
                                  key={project.slug || project.title}
                                  href={project.slug ? `/research/projects/${encodeURIComponent(project.slug)}` : '/research/projects'}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:text-blue-700 dark:hover:border-blue-700/60 dark:hover:text-blue-300 transition-colors"
                                >
                                  {project.title}
                                </Link>
                              ))}
                              {p.projects.length > 3 && (
                                <span className="inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium text-gray-500">
                                  +{p.projects.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                        {p.slug ? (
                          <Link
                            href={`/engagement/partners/${encodeURIComponent(p.slug)}`}
                            className="inline-flex items-center gap-2 text-sm font-bold text-black dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-all group/btn"
                          >
                            Explore Profile 
                            <FaArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        ) : <span />}

                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 w-10 h-10 justify-center rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Visit website"
                          >
                            <FaExternalLinkAlt className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <motion.div variants={itemVariants} className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
              <FaSearch className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-600 dark:text-gray-300">No partners match your filters.</p>
            </motion.div>
          )}
        </>
      ) : null}

      {CollaboratorsClient && (
        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('mapTitle')}</h2>
          <CollaboratorsClient partners={partners} />
        </motion.div>
      )}
    </motion.div>
  );
}

function IndustrialPhDContent() {
  const t = useTranslations('engagement.basic.PhDContent');
  return (
    <motion.div key="phd" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title={t('title')}>
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>{t('p1')}</p>
          <p>{t('p2')}</p>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={FaIndustry}
          title={t('compTitle')}
          desc={t('compDesc')}
        />
        <FeatureCard
          icon={FaUserGraduate}
          title={t('candTitle')}
          desc={t('candDesc')}
        />
        <FeatureCard
          icon={FaHandshake}
          title={t('collabTitle')}
          desc={t('collabDesc')}
        />
      </div>

      <motion.div variants={itemVariants}>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('btnContact')}
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EngagementClient({ projects = [], partners = [], CollaboratorsClient }) {
  const t = useTranslations('engagement.basic.Hero');
  const tTabs = useTranslations('engagement.basic.Tabs');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const activeTab = searchParams.get('tab') || 'public';
  const subTab = searchParams.get('sub') || (activeTab === 'academic' ? 'partnerships' : activeTab === 'industry' ? 'overview' : null);

  const MAIN_TABS = [
    { id: 'public', label: tTabs('public'), icon: FaUsers },
    { id: 'academic', label: tTabs('academic'), icon: FaGraduationCap },
    { id: 'industry', label: tTabs('industry'), icon: FaIndustry },
    { id: 'high-school', label: tTabs('highSchool'), icon: FaSchool },
    { id: 'partners', label: tTabs('partners'), icon: FaHandshake },
    { id: 'phd', label: tTabs('phd'), icon: FaFlask },
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
            {t('title')}
          </motion.h1>
          <motion.p variants={itemVariants} className="text-xl text-blue-100">
            {t('subtitle')}
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
            {activeTab === 'public' && <PublicContent />}
            {activeTab === 'academic' && <AcademicContent subTab={subTab} setSubTab={setSubTab} />}
            {activeTab === 'industry' && <IndustryContent projects={transformedProjects} subTab={subTab} setSubTab={setSubTab} />}
            {activeTab === 'high-school' && <HighSchoolContent />}
            {activeTab === 'partners' && <PartnersContent partners={partners} CollaboratorsClient={CollaboratorsClient} />}
            {activeTab === 'phd' && <IndustrialPhDContent />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}