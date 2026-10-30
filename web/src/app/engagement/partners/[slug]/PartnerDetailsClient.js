'use client';

import Link from 'next/link';
import { FaArrowLeft, FaExternalLinkAlt, FaMapMarkerAlt, FaGlobe, FaProjectDiagram, FaHistory, FaCalendarAlt } from 'react-icons/fa';
import { getProjectPhase, getPhaseColorClasses } from '@/lib/projectPhase';
import BodyContentImage from '@/components/shared/BodyContentImage';
import RichMarkdown from '@/components/shared/RichMarkdown';
import DynamicZone from '@/components/shared/DynamicZone';
import PartnerRoleBadge, { getPartnerRoleConfig } from '@/components/PartnerRoleBadge';

export default function PartnerDetailsClient({ partner }) {
  const tr = (key, fallback) => fallback;
  const projects = Array.isArray(partner?.projects) ? partner.projects : [];
  // split projects into active and past collaborations so expired projects don't look active
  // directly addresses issue 172 where za cloud had the expired distributed ledger project
  const activeProjects = Array.isArray(partner?.activeProjects)
    ? partner.activeProjects
    : projects.filter((p) => !p.isArchived);
  const pastProjects = Array.isArray(partner?.pastProjects)
    ? partner.pastProjects
    : projects.filter((p) => p.isArchived);
  const bodyBlocks = Array.isArray(partner?.body) ? partner.body : [];
  const roleConfig = getPartnerRoleConfig(partner?.role);
  const markdownClassName = 'prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Subtle Atmospheric Top Border/Hero */}
      {partner.heroImage && (
        <div className="w-full h-32 md:h-48 xl:h-64 relative overflow-hidden">
          <img src={partner.heroImage} alt={partner.heroImageAlt || partner.name} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-md" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-[#0a0a0a]" />
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-6 lg:px-8 pb-20 ${partner.heroImage ? '-mt-12 md:-mt-24 relative z-10' : 'pt-16'}`}>
        
        <div className="mb-10 lg:mb-16">
          <Link
            href="/engagement?tab=partners"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            {tr('back', 'Partners')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-24">
          
          {/* Left Column - Metadata & Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-6">
              {partner.logo ? (
                <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gray-50 dark:bg-[#141414] border-2 p-4 flex items-center justify-center shadow-sm ${roleConfig.cardBorder}`}>
                  <img
                    src={partner.logo}
                    alt={partner.logoAlt || `${partner.name} Logo`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FaGlobe className="w-8 h-8 text-gray-400" />
                </div>
              )}

              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black dark:text-white mb-2">
                  {partner.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <PartnerRoleBadge role={partner.role} size="sm" />
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${
                      partner.partnerStatus === 'current'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                        : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                    }`}
                  >
                    {partner.partnerStatus === 'current'
                      ? tr('status.current', 'Current Partner')
                      : tr('status.former', 'Former Partner')}
                  </span>
                </div>
                {partner.country && (
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <FaMapMarkerAlt className="w-3.5 h-3.5" />
                    <span>{partner.country}</span>
                  </div>
                )}
              </div>
            </div>

            {partner.description && (
              <div className="text-base text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                {partner.description}
              </div>
            )}

            {partner.website && (
              <div className="pt-2">
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <span>{tr('visitOfficialWebsite', 'Visit Official Website')}</span>
                  <FaExternalLinkAlt className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Right Column - Deep Content & Projects */}
          <div className="lg:col-span-8 space-y-12 lg:space-y-16">
            
            {/* Dynamic Body Blocks */}
            {bodyBlocks.length > 0 ? (
              <div className="space-y-8">
                <DynamicZone blocks={bodyBlocks} />
              </div>
            ) : (
              /* Fallback rich text if no dynamic blocks */
              partner.descriptionMarkdown && (
                <div className="space-y-4">
                  <RichMarkdown
                    content={partner.descriptionMarkdown}
                    className={markdownClassName}
                  />
                </div>
              )
            )}

            {/* Linked Projects Section */}
            <div className="pt-8 border-t border-gray-100 dark:border-gray-900 space-y-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                  {tr('collaborativeProjects', 'Collaborative Projects')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {tr(
                    'collaborativeProjectsDesc',
                    'Research initiatives and industry engagements developed in partnership with'
                  )}{' ' }
                  {partner.name}.
                </p>
              </div>

              {/* 1. active projects - only show projects currently ongoing */}
              {activeProjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FaProjectDiagram className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Active Projects
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                      {activeProjects.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeProjects.map((project, idx) => {
                      const projectSlug = typeof project === 'object' ? project.slug : null;
                      const projectTitle = typeof project === 'string' ? project : project.title;
                      const phase = getProjectPhase(project.startDate, project.endDate);
                      const phaseClasses = getPhaseColorClasses(phase.status);

                      return projectSlug ? (
                        <Link
                          key={projectSlug || idx}
                          href={`/research/projects/${encodeURIComponent(projectSlug)}`}
                          className="group p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-all bg-white dark:bg-[#0f0f0f] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-semibold text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                {projectTitle}
                              </h4>
                              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${phaseClasses}`}>
                                {phase.status}
                              </span>
                            </div>
                            {project.abstract && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {project.abstract}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-900 flex items-center justify-between text-xs">
                            {(project.startDate || project.endDate) ? (
                              <span className="text-gray-400 flex items-center gap-1">
                                <FaCalendarAlt className="w-3 h-3" />
                                {project.startDate ? project.startDate.substring(0, 4) : ''} {project.endDate ? `– ${project.endDate.substring(0, 4)}` : '– Present'}
                              </span>
                            ) : <span />}
                            <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              View Project →
                            </span>
                          </div>
                        </Link>
                      ) : (
                        <div
                          key={projectTitle || idx}
                          className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]"
                        >
                          <h4 className="font-semibold text-base text-gray-900 dark:text-white">
                            {projectTitle}
                          </h4>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. past collaborations - clearly distinguished so expired projects are not confused with active */}
              {pastProjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FaHistory className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Past Collaborations
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {pastProjects.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastProjects.map((project, idx) => {
                      const projectSlug = typeof project === 'object' ? project.slug : null;
                      const projectTitle = typeof project === 'string' ? project : project.title;
                      const phase = getProjectPhase(project.startDate, project.endDate);
                      const phaseClasses = getPhaseColorClasses(phase.status);

                      return projectSlug ? (
                        <Link
                          key={projectSlug || idx}
                          href={`/research/projects/${encodeURIComponent(projectSlug)}`}
                          className="group p-5 rounded-2xl border border-gray-100 dark:border-gray-800/60 hover:border-gray-400 dark:hover:border-gray-600 transition-all bg-gray-50/50 dark:bg-[#0a0a0a] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-semibold text-base text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                {projectTitle}
                              </h4>
                              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${phaseClasses}`}>
                                {phase.status}
                              </span>
                            </div>
                            {project.abstract && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {project.abstract}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-900 flex items-center justify-between text-xs">
                            {(project.startDate || project.endDate) ? (
                              <span className="text-gray-400 flex items-center gap-1">
                                <FaCalendarAlt className="w-3 h-3" />
                                {project.startDate ? project.startDate.substring(0, 4) : ''} – {project.endDate ? project.endDate.substring(0, 4) : 'Ended'}
                              </span>
                            ) : <span />}
                            <span className="font-semibold text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              View Project →
                            </span>
                          </div>
                        </Link>
                      ) : (
                        <div
                          key={projectTitle || idx}
                          className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]"
                        >
                          <h4 className="font-semibold text-base text-gray-900 dark:text-white">
                            {projectTitle}
                          </h4>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* empty state when neither active nor past projects exist */}
              {activeProjects.length === 0 && pastProjects.length === 0 && (
                <div className="p-8 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                  <p className="text-gray-500 dark:text-gray-400">{tr('noLinkedProjects', 'No linked projects available yet.')}</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
