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
// MAIN TABS CONFIGURATION
// ============================================================================

const MAIN_TABS = [
  { id: 'public', label: 'Public', icon: FaUsers },
  { id: 'academic', label: 'Academic', icon: FaGraduationCap },
  { id: 'industry', label: 'Industry', icon: FaIndustry },
  { id: 'high-school', label: 'High-School', icon: FaSchool },
  { id: 'partners', label: 'Partners', icon: FaHandshake },
  { id: 'phd', label: 'Industrial PhD', icon: FaFlask },
];

const ACADEMIC_SUBTABS = [
  { id: 'partnerships', label: 'Partnerships', icon: FaHandshake },
  { id: 'teaching', label: 'Teaching', icon: FaChalkboardTeacher },
  { id: 'courses', label: 'Courses', icon: FaBook },
  { id: 'mobility', label: 'Mobility', icon: FaPlane },
];

const INDUSTRY_SUBTABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
  { id: 'engagement', label: 'How We Work' },
];

// ============================================================================
// CONTENT SECTIONS
// ============================================================================

function PublicContent() {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title="Public Engagement">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Connecting the AI research community with the broader public through accessible resources, media appearances, and outreach programs.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/media"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaExternalLinkAlt className="w-4 h-4" />
            View Media & Press
          </Link>
          <Link
            href="/news&events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            News & Events
          </Link>
        </div>
      </SectionCard>

      <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={FaUsers}
          title="Outreach Programs"
          desc="Public talks, demonstrations, and community engagement initiatives."
        />
        <FeatureCard
          icon={FaBook}
          title="Educational Resources"
          desc="Open access materials explaining AI concepts to general audiences."
        />
        <FeatureCard
          icon={FaGlobe}
          title="Media Appearances"
          desc="Interviews, articles, and media coverage of our research."
          href="/media"
        />
      </motion.div>
    </motion.div>
  );
}

function AcademicContent({ subTab, setSubTab }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
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

      {subTab === 'partnerships' && (
        <div className="space-y-6">
          <SectionCard title="Academic Partnerships">
            <p className="text-gray-700 dark:text-gray-300">
              A network of international academic collaborations, joint research programs, and institutional partnerships advancing AI research and education.
            </p>
          </SectionCard>
          <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              icon={FaGraduationCap}
              title="University Collaborations"
              desc="Joint research programs with leading universities worldwide."
            />
            <FeatureCard
              icon={FaHandshake}
              title="Research Networks"
              desc="Participation in CLAIRE, ELLIS, and other European AI networks."
            />
          </motion.div>
        </div>
      )}

      {subTab === 'teaching' && (
        <div className="space-y-6">
          <SectionCard title="Teaching & Training">
            <p className="text-gray-700 dark:text-gray-300">
              Courses, summer schools, and workshops for students and researchers at all levels.
            </p>
          </SectionCard>
          <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              icon={FaChalkboardTeacher}
              title="Summer Schools"
              desc="International summer programs in AI and machine learning."
            />
            <FeatureCard
              icon={FaBook}
              title="Workshops"
              desc="Hands-on workshops and training sessions."
            />
          </motion.div>
        </div>
      )}

      {subTab === 'courses' && (
        <div className="space-y-6">
          <SectionCard title="Courses & Workshops">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Specialized courses covering machine learning, robotics, HPC for AI, and AI ethics.
            </p>
          </SectionCard>
          <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              icon={FaFlask}
              title="Machine Learning"
              desc="Applied ML modules, projects, and research-oriented courses."
            />
            <FeatureCard
              icon={FaProjectDiagram}
              title="Robotics & Vision"
              desc="Hands-on labs in automation and vision systems."
            />
            <FeatureCard
              icon={FaIndustry}
              title="HPC for AI"
              desc="GPU programming and large-scale AI training."
            />
            <FeatureCard
              icon={FaInfoCircle}
              title="AI Ethics & Safety"
              desc="Fairness, explainability, and governance in AI systems."
            />
          </motion.div>
        </div>
      )}

      {subTab === 'mobility' && (
        <div className="space-y-6">
          <SectionCard title="Co-tutoring & Mobility">
            <p className="text-gray-700 dark:text-gray-300">
              International exchange programs, joint PhD supervision, and research visit opportunities.
            </p>
          </SectionCard>
          <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={FaUserGraduate}
              title="Co-supervision"
              desc="Joint PhD supervision with international partners."
            />
            <FeatureCard
              icon={FaPlane}
              title="Mobility Grants"
              desc="Funding for research stays and exchanges."
            />
            <FeatureCard
              icon={FaUsers}
              title="Exchanges"
              desc="Student and researcher exchange programs."
            />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function IndustryContent({ projects, subTab, setSubTab }) {
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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
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

      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <motion.div variants={containerVariants} className="grid grid-cols-3 gap-4">
            <motion.div variants={itemVariants} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.projectCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.domainCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Domains</div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.partnerCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Partners</div>
            </motion.div>
          </motion.div>

          <SectionCard title="Industry Collaboration">
            <p className="text-gray-700 dark:text-gray-300">
              We partner with industry leaders to advance AI research and bring innovations to market. Our collaborations span consulting, joint R&D projects, and technology transfer.
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
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              />
            </div>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="">All Domains</option>
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
                Clear
              </button>
            )}
          </div>

          {/* Projects Grid */}
          {filteredProjects.length > 0 ? (
            <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
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
                        Lead: {project.lead}
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
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <FaProjectDiagram className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No projects match your filters.</p>
            </div>
          )}
        </div>
      )}

      {subTab === 'engagement' && (
        <div className="space-y-6">
          <SectionCard title="How We Work With Industry">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We offer various engagement models to suit different industry needs and collaboration depths.
            </p>
          </SectionCard>
          <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              icon={FaFlask}
              title="Joint R&D Projects"
              desc="Collaborative research projects with shared IP and outcomes."
            />
            <FeatureCard
              icon={FaChalkboardTeacher}
              title="Consulting Services"
              desc="Expert advice on AI strategy, implementation, and best practices."
            />
            <FeatureCard
              icon={FaUserGraduate}
              title="Training Programs"
              desc="Customized training for industry teams on AI technologies."
            />
            <FeatureCard
              icon={FaHandshake}
              title="Technology Transfer"
              desc="Licensing and commercialization of research outputs."
            />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function HighSchoolContent() {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title="High-School Engagement">
        <p className="text-gray-700 dark:text-gray-300">
          Competitions, events, and AI literacy resources for students and teachers, fostering the next generation of AI researchers.
        </p>
      </SectionCard>

      <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={FaGraduationCap}
          title="Competitions"
          desc="AI and programming competitions for high-school students."
        />
        <FeatureCard
          icon={FaUsers}
          title="Events"
          desc="Workshops, lab visits, and sessions with experts."
        />
        <FeatureCard
          icon={FaBook}
          title="Educational Resources"
          desc="Guides and materials for AI literacy."
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <a
          href="https://ailiteracyframework.org/wp-content/uploads/2025/05/AILitFramework_ReviewDraft.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaExternalLinkAlt className="w-4 h-4" />
          AILIT Framework – Resources
        </a>
      </motion.div>
    </motion.div>
  );
}

function PartnersContent({ partners, CollaboratorsClient }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title="Our Partners">
        <p className="text-gray-700 dark:text-gray-300">
          We collaborate with leading organizations in AI research and development, including CLAIRE, ELLIS, AIoD, euRobotics, ADRA, AI4Europe, and BDVA.
        </p>
      </SectionCard>

      {partners && partners.length > 0 && (
        <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map(p => (
            <motion.a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-all group"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {p.name}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{p.blurb}</p>
            </motion.a>
          ))}
        </motion.div>
      )}

      {CollaboratorsClient && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Partners Map</h2>
          <CollaboratorsClient partners={partners} />
        </div>
      )}
    </motion.div>
  );
}

function IndustrialPhDContent() {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title="Industrial PhD Program">
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>
            An Industrial PhD is a university training program that qualifies for the award of a doctorate through an industrial research or experimental development project, created collaboratively between a company and an academic environment.
          </p>
          <p>
            If you are a company interested in carrying out an industrial PhD, or if you want to pursue an Industrial Doctorate in Artificial Intelligence with us, please get in touch via email.
          </p>
        </div>
      </SectionCard>

      <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={FaIndustry}
          title="For Companies"
          desc="Partner with us for applied AI research that solves real business challenges."
        />
        <FeatureCard
          icon={FaUserGraduate}
          title="For Candidates"
          desc="Combine academic research with practical industry experience."
        />
        <FeatureCard
          icon={FaHandshake}
          title="Collaboration Model"
          desc="Joint supervision between industry mentors and academic advisors."
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Contact Us
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EngagementClient({ projects = [], partners = [], CollaboratorsClient }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const activeTab = searchParams.get('tab') || 'public';
  const subTab = searchParams.get('sub') || (activeTab === 'academic' ? 'partnerships' : activeTab === 'industry' ? 'overview' : null);

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
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.h1 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-2">
            Engagement
          </motion.h1>
          <motion.p variants={itemVariants} className="text-xl text-blue-100">
            Connecting AIRi @ UTCN with the public, academia, and industry.
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
            key={activeTab}
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
