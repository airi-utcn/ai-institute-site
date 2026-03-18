'use client';

import Link from 'next/link';
import Markdown from 'markdown-to-jsx';
import { FaArrowLeft, FaExternalLinkAlt, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';
import { useTranslations } from 'next-intl';

export default function PartnerDetailsClient({ partner }) {
  const t = useTranslations('engagement.basic');
  const tr = (key, fallback, values) =>
    (t.has(`PartnerDetails.${key}`) ? t(`PartnerDetails.${key}`, values) : fallback);
  const projects = Array.isArray(partner?.projects) ? partner.projects : [];
  const bodyBlocks = Array.isArray(partner?.body) ? partner.body : [];

  const renderMarkdown = (value, key) => {
    if (!value) return null;
    return (
      <div key={key} className="prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
        <Markdown>{typeof value === 'string' ? value : String(value)}</Markdown>
      </div>
    );
  };

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
          
          {/* LEFT COLUMN: STICKY METADATA */}
          <aside className="lg:col-span-4 flex flex-col gap-8">
            <div className="sticky top-24">
              {/* Logo Box */}
              {partner.logo ? (
                <div className="w-24 h-24 sm:w-32 sm:h-32 mb-8 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                  <img src={partner.logo} alt={partner.name} className="w-full h-full object-cover rounded-2xl" />
                </div>
              ) : null}

              {/* Name & Country */}
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
                  {partner.name}
                </h1>
                
                {partner.country && (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                    <FaMapMarkerAlt className="w-4 h-4" />
                    <span>{partner.country}</span>
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-8" />

              {/* Short Bio / Description */}
              {partner.descriptionMarkdown && (
                <div className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                  {renderMarkdown(partner.descriptionMarkdown, 'desc')}
                </div>
              )}

              {/* Website Button */}
              {partner.url && (
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 font-medium transition-all shadow-sm"
                >
                  <FaGlobe className="w-5 h-5" />
                  {tr('visitOfficialWebsite', 'Visit Official Website')}
                  <FaExternalLinkAlt className="w-3.5 h-3.5 ml-auto" />
                </a>
              )}
            </div>
          </aside>

          {/* RIGHT COLUMN: MAIN CONTENT */}
          <main className="lg:col-span-8 flex flex-col gap-16 xl:gap-24">
            
            {/* Dynamic Content Blocks */}
            {bodyBlocks.length > 0 && (
              <section className="space-y-12">
                {bodyBlocks.map((block, index) => {
                  if (!block || typeof block !== 'object') return null;

                  if (block.__component === 'shared.rich-text') {
                    return (
                      <div key={`rich-${index}`} className="prose-wrapper">
                        {renderMarkdown(block.body, `rich-body-${index}`)}
                      </div>
                    );
                  }

                  if (block.__component === 'shared.section') {
                    return (
                      <article key={`section-${index}`} className="space-y-6">
                        <header>
                          {block.heading && <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{block.heading}</h3>}
                          {block.subheading && <p className="text-lg text-gray-500 dark:text-gray-400">{block.subheading}</p>}
                        </header>
                        
                        {renderMarkdown(block.body, `section-body-${index}`)}
                        
                        {block.media && (
                          <div className="mt-8 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            <img src={block.media} alt={block.heading || partner.name} className="w-full max-h-[36rem] object-cover" />
                          </div>
                        )}
                      </article>
                    );
                  }

                  if (block.__component === 'shared.media' && block.file) {
                    return (
                      <figure key={`media-${index}`} className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
                        <img src={block.file} alt={partner.name} className="max-h-[40rem] w-full object-contain rounded-xl" />
                      </figure>
                    );
                  }

                  if (block.__component === 'shared.slider' && Array.isArray(block.files) && block.files.length > 0) {
                    return (
                      <div key={`slider-${index}`} className="grid gap-4 sm:grid-cols-2">
                        {block.files.map((file, fileIndex) => (
                          <figure key={`slider-file-${index}-${fileIndex}`} className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900">
                            <img src={file} alt={`${partner.name} media ${fileIndex + 1}`} className="aspect-video w-full object-cover" />
                          </figure>
                        ))}
                      </div>
                    );
                  }

                  return null;
                })}
              </section>
            )}

            {/* Related Projects - Sleek List Style */}
            <section className="pt-10 border-t border-gray-100 dark:border-gray-800">
              <header className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {tr('collaborativeProjects', 'Collaborative Projects')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {tr(
                    'collaborativeProjectsSubtitle',
                    `Research and initiatives featuring ${partner.name || ''}.`,
                    { partnerName: partner.name || '' }
                  )}
                </p>
              </header>

              {projects.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {projects.map((project) => {
                    const projectSlug = project.slug ? encodeURIComponent(project.slug) : '';
                    return (
                      <Link
                        key={project.slug || project.title}
                        href={projectSlug ? `/research/projects/${projectSlug}` : '/research/projects'}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 px-6 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1 max-w-2xl">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1 pr-4">
                            {project.title}
                          </h3>
                          {project.abstract && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {project.abstract}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-sm text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-1">
                            <FaArrowLeft className="w-3.5 h-3.5 rotate-180" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-gray-500 dark:text-gray-400">{tr('noLinkedProjects', 'No linked projects available yet.')}</p>
                </div>
              )}
            </section>

          </main>
        </div>
      </div>
    </div>
  );
}
