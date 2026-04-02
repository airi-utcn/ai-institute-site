'use client';

import Link from 'next/link';
import { FaArrowLeft, FaExternalLinkAlt, FaCalendar, FaUser, FaTag, FaLinkedin } from 'react-icons/fa';
import { useTranslations, useLocale } from 'next-intl';
import BodyContentImage from '@/components/shared/BodyContentImage';
import RichMarkdown from '@/components/shared/RichMarkdown';
import GallerySlideshow from '@/components/shared/GallerySlideshow';

export default function NewsArticleClient({ article }) {
  const t = useTranslations('news&events.news');
  const locale = useLocale();

  const tr = (key, fallback, values) =>
    (t.has(`article.${key}`) ? t(`article.${key}`, values) : fallback);

  const getCategoryLabel = (value) => {
    const knownKeys = ['announcement', 'construction', 'collaboration', 'award', 'press', 'other'];
    const key = knownKeys.includes(value) ? value : 'other';
    return t.has(`categories.${key}`) ? t(`categories.${key}`) : key;
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
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Category badge on hero */}
          <div className="absolute top-6 left-6">
            <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-medium">
              {getCategoryLabel(article.category)}
            </span>
          </div>
        </div>
      )}

      <div className={`max-w-4xl mx-auto px-6 lg:px-8 pb-20 ${article.image ? '-mt-20 relative z-10' : 'pt-16'}`}>
        
        {/* Back navigation */}
        <div className={`${article.image ? 'mb-6' : 'mb-10'}`}>
          <Link
            href="/news&events/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            {tr('backToNews', 'Back to News')}
          </Link>
        </div>

        {/* Article Header Card */}
        <header className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 md:p-12 mb-12">
          {/* Category if no hero */}
          {!article.image && (
            <div className="mb-4">
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium">
                {getCategoryLabel(article.category)}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-6">
            {article.title}
          </h1>

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
            {article.date && (
              <div className="flex items-center gap-2">
                <FaCalendar className="w-4 h-4" />
                <time dateTime={article.date}>{formatDate(article.date)}</time>
              </div>
            )}
            {article.author && (
              <div className="flex items-center gap-2">
                <FaUser className="w-4 h-4" />
                <Link
                  href={`/people/${article.author.slug}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {article.author.name}
                </Link>
              </div>
            )}
            {article.image && (
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                {getCategoryLabel(article.category)}
              </span>
            )}
          </div>

          {/* Summary as lead paragraph */}
          {article.summary && (
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 border-blue-500 pl-6">
              {article.summary}
            </p>
          )}

          {/* External link button */}
          {article.linkUrl && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <a
                href={article.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[#0077B5] hover:bg-[#006097] text-white font-medium transition-colors"
              >
                <FaLinkedin className="w-5 h-5" />
                {tr('readOnLinkedIn', 'Read on LinkedIn')}
                <FaExternalLinkAlt className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </header>

        {/* Article Body - Dynamic Zone Content */}
        {bodyBlocks.length > 0 && (
          <article className="space-y-12 mb-16">
            {bodyBlocks.map((block, index) => {
              if (!block || typeof block !== 'object') return null;

              if (block.__component === 'shared.rich-text') {
                return (
                  <div key={`rich-${index}`} className="prose-wrapper">
                    <RichMarkdown content={block.body} className={markdownClassName} />
                  </div>
                );
              }

              if (block.__component === 'shared.section') {
                return (
                  <section key={`section-${index}`} className="space-y-6">
                    <header>
                      {block.heading && (
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                          {block.heading}
                        </h2>
                      )}
                      {block.subheading && (
                        <p className="text-lg text-gray-500 dark:text-gray-400">{block.subheading}</p>
                      )}
                    </header>
                    
                    <RichMarkdown content={block.body} className={markdownClassName} />
                    
                    {block.media && (
                      <figure className="mt-8 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                        <BodyContentImage
                          src={block.media}
                          alt={block.heading || article.title}
                          className="w-full"
                          portraitClassName="mx-auto w-auto max-w-full max-h-[60vh] object-contain"
                          landscapeClassName="w-full max-h-[36rem] object-cover"
                        />
                      </figure>
                    )}
                  </section>
                );
              }

              if (block.__component === 'shared.media' && block.file) {
                return (
                  <figure key={`media-${index}`} className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
                    <BodyContentImage
                      src={block.file}
                      alt={article.title}
                      className="rounded-xl"
                      portraitClassName="mx-auto w-auto max-w-full max-h-[60vh] object-contain"
                      landscapeClassName="w-full max-h-[40rem] object-contain"
                    />
                  </figure>
                );
              }

              if (block.__component === 'shared.slider' && Array.isArray(block.files) && block.files.length > 0) {
                return (
                  <div key={`slider-${index}`} className="grid gap-4 sm:grid-cols-2">
                    {block.files.map((file, fileIndex) => (
                      <figure key={`slider-file-${index}-${fileIndex}`} className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900">
                        <BodyContentImage
                          src={file}
                          alt={`${article.title} image ${fileIndex + 1}`}
                          landscapeClassName="aspect-video w-full object-cover"
                          portraitClassName="mx-auto w-auto max-w-full max-h-[60vh] object-contain"
                        />
                      </figure>
                    ))}
                  </div>
                );
              }

              if (block.__component === 'shared.quote') {
                return (
                  <blockquote key={`quote-${index}`} className="relative border-l-4 border-blue-500 pl-6 py-4 my-8 bg-gray-50 dark:bg-gray-900 rounded-r-2xl">
                    {block.title && (
                      <p className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200 italic mb-3">
                        &ldquo;{block.title}&rdquo;
                      </p>
                    )}
                    {block.body && (
                      <cite className="text-gray-600 dark:text-gray-400 not-italic">
                        — {block.body}
                      </cite>
                    )}
                  </blockquote>
                );
              }

              return null;
            })}
          </article>
        )}

        {/* Gallery Slideshow */}
        {gallery.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              {tr('gallery', 'Gallery')}
            </h2>
            <GallerySlideshow images={gallery} alt={article.title} />
          </section>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <section className="mb-12 pb-8 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <FaTag className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{tr('tags', 'Tags')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Related Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Related Projects */}
          {relatedProjects.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {tr('relatedProjects', 'Related Projects')}
              </h3>
              <div className="space-y-3">
                {relatedProjects.map((project) => (
                  <Link
                    key={project.slug || project.title}
                    href={`/research/projects/${project.slug}`}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors"
                  >
                    {project.image && (
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {project.title}
                      </h4>
                      {project.phase && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{project.phase}</span>
                      )}
                    </div>
                    <FaArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-500 rotate-180 transition-all group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Featured People */}
          {featuredPeople.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {tr('featuredPeople', 'Featured People')}
              </h3>
              <div className="space-y-3">
                {featuredPeople.map((person) => (
                  <Link
                    key={person.slug || person.name}
                    href={`/people/${person.slug}`}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors"
                  >
                    {person.image ? (
                      <img
                        src={person.image}
                        alt={person.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <FaUser className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {person.name}
                      </h4>
                      {person.title && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{person.title}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Related Departments */}
        {relatedDepartments.length > 0 && (
          <section className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {tr('relatedDepartments', 'Related Departments')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedDepartments.map((dept) => (
                <Link
                  key={dept.slug || dept.name}
                  href={`/research/domains/${dept.slug}`}
                  className="px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium transition-colors"
                >
                  {dept.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
