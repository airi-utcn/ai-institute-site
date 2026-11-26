'use client';

import Link from 'next/link';
import { FaArrowLeft, FaCalendarAlt, FaFolderOpen } from 'react-icons/fa';
import DynamicZone from '@/components/shared/DynamicZone';
import MediaAttachment from '@/components/shared/MediaAttachment';
import BackLink from '@/components/BackLink';

import { useLocale } from '@/context/LocaleContext';

export default function ResultDetailsClient({ result }) {
  const locale = useLocale();
  const projects = Array.isArray(result?.projects) ? result.projects : [];
  const laboratories = result.laboratories || [];
  const attachments = (result.attachments || []).filter((file) => file.url);
  const bodyBlocks = Array.isArray(result?.body) ? result.body : [];

  const showLaboratories = projects.length === 0 && laboratories.length > 0;
  const parentPath = showLaboratories ? '/research/laboratories' : '/research/projects';
  const parents = showLaboratories ? laboratories : projects;
  const parent = parents.length === 1 ? parents[0] : null;
  const backHref = parent?.slug ? `${parentPath}/${encodeURIComponent(parent.slug)}?tab=results` : parentPath;
  const backLabel = parent?.title || (showLaboratories ? 'Back to Laboratories' : 'Back to Projects');

  const attachmentCards = attachments.map((file) => (
    <MediaAttachment
      key={file.id ?? file.url}
      media={{ ...file, size: file.size * 1000 }}
      caption={file.caption}
      className="min-w-0"
      download
    />
  ));

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-20">
        
        {/* Breadcrumb */}
        <div className="mb-10 lg:mb-16">
          <BackLink
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            {backLabel}
          </BackLink>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-24">
          
          {/* LEFT COLUMN: METADATA */}
          <aside className="lg:col-span-4 flex flex-col gap-8">
            <div className="sticky top-24">
              {/* Title */}
              <div className="space-y-4 mb-8">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
                  {result.title}
                </h1>
                
                {result.publishedDate && (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                    <FaCalendarAlt className="w-4 h-4" />
                    <span>
                      {new Date(result.publishedDate).toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Related Project */}
              {projects.length > 0 && (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-100 dark:border-gray-800 space-y-3 mb-8">
                  <span className="text-xs font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                    Part of Project
                  </span>
                  <div className="space-y-2">
                    {projects.map((proj) => (
                      <div key={proj.slug || proj.id}>
                        <Link
                          href={`/research/projects/${encodeURIComponent(proj.slug)}`}
                          className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
                        >
                          {proj.title}
                        </Link>
                        {proj.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Downloads Card (Desktop) */}
              {attachments.length > 0 && (
                <div className="hidden lg:block p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/80 dark:border-blue-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold tracking-wider text-blue-900 dark:text-blue-300 uppercase">
                      Downloads
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {attachments.length} {attachments.length === 1 ? 'attachment' : 'attachments'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {attachmentCards}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT COLUMN: MAIN CONTENT */}
          <main className="lg:col-span-8 flex flex-col gap-12">
            
            {/* Description/Abstract */}
            {result.description && (
              <div className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-normal leading-relaxed">
                {result.description}
              </div>
            )}

            {/* Dynamic Body Blocks */}
            {bodyBlocks.length > 0 && (
              <div className="space-y-12">
                <DynamicZone blocks={bodyBlocks} />
              </div>
            )}

            {/* Attachments Section (Mobile & Tablet Fallback / Bottom Section) */}
            {attachments.length > 0 && (
              <div className="lg:hidden border-t border-gray-100 dark:border-gray-800 pt-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FaFolderOpen className="text-blue-600 dark:text-blue-400" />
                  Attachments
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachmentCards}
                </div>
              </div>
            )}

          </main>

        </div>
      </div>
    </div>
  );
}
