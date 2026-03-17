'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'markdown-to-jsx';
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
  FaUserGraduate
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

  return (
    <motion.div key="partners" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title={t('title')}>
        <p className="text-gray-700 dark:text-gray-300">
          {t('desc')}
        </p>
      </SectionCard>

      {partnerList.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partnerList.map(p => (
            <motion.div
              key={p.slug || p.name}
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start gap-3 mb-3">
                {p.logo ? (
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-2 flex items-center justify-center">
                    <img src={p.logo} alt={p.name} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : null}
                <div className="min-w-0">
                  {p.slug ? (
                    <Link
                      href={`/engagement/partners/${encodeURIComponent(p.slug)}`}
                      className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                  )}
                  {p.country ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.country}</p> : null}
                </div>
              </div>

              {p.descriptionMarkdown ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 line-clamp-4">
                  <Markdown>{p.descriptionMarkdown}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">{p.blurb || p.description}</p>
              )}

              {Array.isArray(p.projects) && p.projects.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.projects.slice(0, 3).map((project) => (
                    <Link
                      key={project.slug || project.title}
                      href={project.slug ? `/research/projects/${encodeURIComponent(project.slug)}` : '/research/projects'}
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      {project.title}
                    </Link>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-4 text-sm">
                {p.slug ? (
                  <Link
                    href={`/engagement/partners/${encodeURIComponent(p.slug)}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Partner profile
                  </Link>
                ) : null}
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-300 hover:underline">
                    Website
                  </a>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      )}

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