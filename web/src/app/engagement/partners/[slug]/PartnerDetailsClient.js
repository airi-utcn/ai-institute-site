'use client';

import Link from 'next/link';
import { FaArrowLeft, FaExternalLinkAlt, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';
import BodyContentImage from '@/components/shared/BodyContentImage';
import RichMarkdown from '@/components/shared/RichMarkdown';

export default function PartnerDetailsClient({ partner }) {
  const tr = (key, fallback) => fallback;
  const projects = Array.isArray(partner?.projects) ? partner.projects : [];
  const bodyBlocks = Array.isArray(partner?.body) ? partner.body : [];
  const markdownClassName = 'prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Subtle Atmospheric Top Border/Hero */}
      {partner.heroImage && (
        <div className="w-full h-32 md:h-48 xl:h-64 relative overflow-hidden">
          <img src={partner.heroImage} alt={partner.name} className="absolute inset-0 w-full h-full object-cover" />
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
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-center">
                  <img
                    src={partner.logo}
                    alt={`${partner.name} Logo`}
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
                {bodyBlocks.map((block, index) => {
                  if (!block) return null;

                  switch (block.__component) {
                    case 'shared.rich-text':
                      return (
                        <RichMarkdown
                          key={`rich-${index}`}
                          content={block.body}
                          className={markdownClassName}
                        />
                      );

                    case 'shared.section':
                      return (
                        <section key={`section-${index}`} className="my-8 first:mt-0">
                          {block.heading && (
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                              {block.heading}
                            </h2>
                          )}
                          <RichMarkdown
                            content={block.body}
                            className={markdownClassName}
                          />
                        </section>
                      );

                    case 'shared.media':
                      return (
                        <BodyContentImage
                          key={`media-${index}`}
                          block={block}
                          className="my-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800"
                        />
                      );

                    case 'shared.slider':
                      return (
                        <div key={`slider-${index}`} className="my-8 space-y-4">
                          {Array.isArray(block.files) &&
                            block.files.map((file, fileIndex) => (
                              <BodyContentImage
                                key={`slide-${index}-${fileIndex}`}
                                block={{ file }}
                                className="rounded-xl shadow-lg border border-gray-100 dark:border-gray-800"
                              />
                            ))}
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
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

            {/* Linked Projects */}
            <div className="pt-8 border-t border-gray-100 dark:border-gray-900">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                  {tr('collaborativeProjects', 'Collaborative Projects')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {tr(
                    'collaborativeProjectsDesc',
                    'Research initiatives and industry engagements developed in partnership with'
                  )}{' '}
                  {partner.name}.
                </p>
              </div>

              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project, idx) => {
                    const projectSlug = typeof project === 'object' ? project.slug : null;
                    const projectTitle = typeof project === 'string' ? project : project.title;

                    return projectSlug ? (
                      <Link
                        key={projectSlug || idx}
                        href={`/research/projects/${encodeURIComponent(projectSlug)}`}
                        className="group p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-all bg-white dark:bg-[#0f0f0f]"
                      >
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {projectTitle}
                        </h3>
                        {project.abstract && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                            {project.abstract}
                          </p>
                        )}
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          <span>View Project</span>
                          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                        </div>
                      </Link>
                    ) : (
                      <div
                        key={projectTitle || idx}
                        className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]"
                      >
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white">
                          {projectTitle}
                        </h3>
                      </div>
                    );
                  })}
                </div>
              ) : (
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
