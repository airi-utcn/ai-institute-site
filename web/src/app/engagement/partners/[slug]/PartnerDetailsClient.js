'use client';

import Link from 'next/link';
import Markdown from 'markdown-to-jsx';
import { FaArrowLeft, FaExternalLinkAlt, FaHandshake } from 'react-icons/fa';

export default function PartnerDetailsClient({ partner }) {
  const projects = Array.isArray(partner?.projects) ? partner.projects : [];
  const bodyBlocks = Array.isArray(partner?.body) ? partner.body : [];

  const renderMarkdown = (value, key) => {
    if (!value) return null;
    return (
      <div key={key} className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
        <Markdown>{typeof value === 'string' ? value : String(value)}</Markdown>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          href="/engagement?tab=partners"
          className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <FaArrowLeft className="w-4 h-4" />
          Back to partners
        </Link>

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
          {partner.heroImage ? (
            <div className="relative h-48 md:h-64">
              <img src={partner.heroImage} alt={partner.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
            </div>
          ) : null}

          <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {partner.logo ? (
                <div className="h-16 w-16 rounded-xl bg-white dark:bg-gray-700/40 p-3 flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700">
                  <img src={partner.logo} alt={partner.name} className="max-h-full max-w-full object-contain" />
                </div>
              ) : null}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{partner.name}</h1>
                {partner.country ? <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{partner.country}</p> : null}
              </div>
            </div>

            {partner.url ? (
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Visit website
                <FaExternalLinkAlt className="w-3 h-3" />
              </a>
            ) : null}
          </div>

          {partner.descriptionMarkdown ? (
            <div className="prose dark:prose-invert max-w-none mt-6 text-gray-700 dark:text-gray-300">
              <Markdown>{partner.descriptionMarkdown}</Markdown>
            </div>
          ) : null}

          {bodyBlocks.length > 0 ? (
            <div className="mt-8 space-y-8">
              {bodyBlocks.map((block, index) => {
                if (!block || typeof block !== 'object') return null;

                if (block.__component === 'shared.rich-text') {
                  return renderMarkdown(block.body, `rich-${index}`);
                }

                if (block.__component === 'shared.section') {
                  return (
                    <article key={`section-${index}`} className="space-y-3">
                      {block.heading ? <h3 className="text-xl font-bold text-gray-900 dark:text-white">{block.heading}</h3> : null}
                      {block.subheading ? <p className="text-sm text-gray-600 dark:text-gray-400">{block.subheading}</p> : null}
                      {renderMarkdown(block.body, `section-body-${index}`)}
                      {block.media ? (
                        <img src={block.media} alt={block.heading || partner.name} className="rounded-xl w-full max-h-[26rem] object-cover" />
                      ) : null}
                    </article>
                  );
                }

                if (block.__component === 'shared.media' && block.file) {
                  return (
                    <div key={`media-${index}`}>
                      <img src={block.file} alt={partner.name} className="rounded-xl w-full max-h-[30rem] object-contain bg-gray-50 dark:bg-gray-700/30" />
                    </div>
                  );
                }

                if (block.__component === 'shared.slider' && Array.isArray(block.files) && block.files.length > 0) {
                  return (
                    <div key={`slider-${index}`} className="grid gap-3 sm:grid-cols-2">
                      {block.files.map((file, fileIndex) => (
                        <img
                          key={`slider-file-${index}-${fileIndex}`}
                          src={file}
                          alt={`${partner.name} media ${fileIndex + 1}`}
                          className="rounded-xl w-full h-56 object-cover"
                        />
                      ))}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          ) : null}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaHandshake className="text-blue-600 dark:text-blue-400" />
            Projects With This Partner
          </h2>

          {projects.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.slug || project.title}
                  href={project.slug ? `/research/projects/${encodeURIComponent(project.slug)}` : '/research/projects'}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">{project.title}</h3>
                  {project.abstract ? (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{project.abstract}</p>
                  ) : null}
                  <span className="inline-flex mt-3 text-sm text-blue-600 dark:text-blue-400">Open project</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">No linked projects yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
