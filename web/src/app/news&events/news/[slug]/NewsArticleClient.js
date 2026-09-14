'use client';

import Link from 'next/link';
import { FaArrowLeft, FaExternalLinkAlt, FaCalendar, FaUser, FaTag, FaLinkedin } from 'react-icons/fa';
import { useLocale } from '@/context/LocaleContext';
import BodyContentImage from '@/components/shared/BodyContentImage';
import MediaPlayer from '@/components/shared/MediaPlayer';
import RichMarkdown from '@/components/shared/RichMarkdown';
import GallerySlideshow from '@/components/shared/GallerySlideshow';

export default function NewsArticleClient({ article }) {
  const locale = useLocale();
  const authorLabel = 'By';

  const tr = (key, fallback) => fallback;

  const getCategoryLabel = (value) => {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Other';
  };

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const bodyBlocks = Array.isArray(article?.body) ? article.body : [];
  const gallery = Array.isArray(article?.gallery) ? article.gallery : [];
  const tags = Array.isArray(article?.tags) ? article.tags : [];
  const relatedProjects = Array.isArray(article?.relatedProjects) ? article.relatedProjects : [];
  const relatedDepartments = Array.isArray(article?.relatedDepartments) ? article.relatedDepartments : [];
  const featuredPeople = Array.isArray(article?.featuredPeople) ? article.featuredPeople : [];

  const markdownClassName = 'prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Hero Image */}
      {article.image && (
        <div className="w-full h-64 md:h-80 xl:h-96 relative overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Back Link */}
        <Link
          href="/news&events/news"
          className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 font-medium"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          {tr('backToNews', 'Back to News')}
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {article.category && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {getCategoryLabel(article.category)}
              </span>
            )}
            {article.date && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <FaCalendar className="w-3 h-3" />
                {formatDate(article.date)}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-4">
            {article.title}
          </h1>

          {/* Author */}
          {article.author?.name && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                <FaUser className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {authorLabel} {article.author.name}
                </div>
                {article.author.title && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {article.author.title}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary / Lead */}
          {article.summary && (
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
              {article.summary}
            </p>
          )}

          {/* External Links */}
          <div className="flex flex-wrap gap-3 mt-4">
            {article.linkUrl && (
              <a
                href={article.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <span>Read Original Article</span>
                <FaExternalLinkAlt className="w-3 h-3" />
              </a>
            )}
            {article.linkedinPost && (
              <a
                href={article.linkedinPost}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077b5] hover:bg-[#006396] text-white text-sm font-medium transition-colors"
              >
                <FaLinkedin className="w-3.5 h-3.5" />
                <span>{tr('readOnLinkedIn', 'Read on LinkedIn')}</span>
                <FaExternalLinkAlt className="w-3 h-3" />
              </a>
            )}
          </div>
        </header>

        {/* Dynamic Zone Body Content */}
        {bodyBlocks.length > 0 ? (
          <div className="space-y-8 my-8">
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

                case 'shared.media-player':
                  return (
                    <div key={`player-${index}`} className="my-8">
                      <MediaPlayer block={block} />
                    </div>
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

                case 'shared.quote':
                  return (
                    <blockquote
                      key={`quote-${index}`}
                      className="my-8 pl-6 border-l-4 border-blue-600 dark:border-blue-400 italic text-xl text-gray-800 dark:text-gray-200"
                    >
                      <p>{block.quote}</p>
                      {block.author && (
                        <footer className="mt-2 text-sm not-italic font-semibold text-gray-600 dark:text-gray-400">
                          — {block.author}
                        </footer>
                      )}
                    </blockquote>
                  );

                default:
                  return null;
              }
            })}
          </div>
        ) : (
          /* Fallback content if no body blocks */
          article.content && (
            <div className="my-8">
              <RichMarkdown
                content={article.content}
                className={markdownClassName}
              />
            </div>
          )
        )}

        {/* Gallery / Slideshow */}
        {gallery.length > 0 && (
          <section className="my-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {tr('gallery', 'Gallery')}
            </h2>
            <GallerySlideshow images={gallery} />
          </section>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 my-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <FaTag className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{tr('tags', 'Tags')}</span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <section className="my-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {tr('relatedProjects', 'Related Projects')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedProjects.map((project) => {
                const projectTitle = typeof project === 'string' ? project : project.title || project.name;
                const projectSlug = typeof project === 'object' ? project.slug : null;

                return projectSlug ? (
                  <Link
                    key={projectSlug}
                    href={`/research/projects/${encodeURIComponent(projectSlug)}`}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors block group"
                  >
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {projectTitle}
                    </div>
                  </Link>
                ) : (
                  <div
                    key={projectTitle}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-800"
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {projectTitle}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Featured People */}
        {featuredPeople.length > 0 && (
          <section className="my-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {tr('featuredPeople', 'Featured People')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {featuredPeople.map((person) => {
                const personName = typeof person === 'string' ? person : person.name;
                const personSlug = typeof person === 'object' ? person.slug : null;
                const personTitle = typeof person === 'object' ? person.title : null;

                return personSlug ? (
                  <Link
                    key={personSlug}
                    href={`/people/${encodeURIComponent(personSlug)}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                      {personName?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {personName}
                      </div>
                      {personTitle && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {personTitle}
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div
                    key={personName}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                      {personName?.charAt(0) || 'P'}
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {personName}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Related Departments */}
        {relatedDepartments.length > 0 && (
          <section className="my-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {tr('relatedDepartments', 'Related Departments')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedDepartments.map((dept) => (
                <span
                  key={typeof dept === 'string' ? dept : dept.name}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
                >
                  {typeof dept === 'string' ? dept : dept.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
