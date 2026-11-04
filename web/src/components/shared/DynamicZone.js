'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  FaUsers,
  FaBook,
  FaGlobe,
  FaNewspaper,
  FaLightbulb,
  FaGraduationCap,
  FaHandshake,
  FaCalendarAlt,
  FaLink,
  FaExternalLinkAlt,
  FaRocket,
  FaFlask,
  FaArrowRight,
} from 'react-icons/fa';
import RichMarkdown from '@/components/shared/RichMarkdown';
import BodyContentImage from '@/components/shared/BodyContentImage';
import MediaPlayer from '@/components/shared/MediaPlayer';
import GallerySlideshow from '@/components/shared/GallerySlideshow';
import { buildSrcSetFromFormats } from '@/lib/media';

const resolveMediaUrl = (media) => {
  if (!media) return null;
  let url = '';
  if (typeof media === 'string') {
    url = media;
  } else {
    url =
      media.url ||
      media.src ||
      media.attributes?.url ||
      media.data?.attributes?.url ||
      media.data?.url ||
      '';
  }
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  
  const baseUrl = (process.env.NEXT_PUBLIC_STRAPI_URL || '').replace(/\/+$/, '');
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

const resolveMediaSrcSet = (media) => {
  if (!media || typeof media === 'string') return '';
  const data = media.data ?? media;
  const attrs = data.attributes ?? data;
  return buildSrcSetFromFormats({
    url: resolveMediaUrl(data) || '',
    formats: attrs.formats,
    width: attrs.width,
    resolveUrl: resolveMediaUrl,
  });
};

const ICON_MAP = {
  users: FaUsers,
  book: FaBook,
  globe: FaGlobe,
  newspaper: FaNewspaper,
  lightbulb: FaLightbulb,
  'graduation-cap': FaGraduationCap,
  graduationcap: FaGraduationCap,
  handshake: FaHandshake,
  calendar: FaCalendarAlt,
  link: FaLink,
  external: FaExternalLinkAlt,
  rocket: FaRocket,
  flask: FaFlask,
};

function resolveIcon(iconName) {
  if (!iconName) return null;
  const key = String(iconName).toLowerCase().trim();
  return ICON_MAP[key] || FaLightbulb;
}

function DynamicCard({ card, className = '' }) {
  if (!card) return null;
  const Icon = resolveIcon(card.icon);
  const imageUrl = resolveMediaUrl(card.image);
  const href = card.linkUrl;
  const isExternal = href && (/^https?:\/\//i.test(href) || href.startsWith('//'));
  const isAnchor = typeof href === 'string' && href.startsWith('#');

  const cardContent = (
    <div
      className={`h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition-all duration-300 flex flex-col justify-between ${
        href ? 'hover:shadow-lg hover:border-blue-500/50 dark:hover:border-blue-400/50 cursor-pointer group' : ''
      } ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          {imageUrl ? (
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-800">
              <img src={imageUrl} alt={card.title || 'Card image'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
          ) : Icon ? (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform">
              <Icon className="w-5 h-5" />
            </div>
          ) : null}

          {card.badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
              {card.badge}
            </span>
          )}
        </div>

        <h3 className={`text-lg font-bold text-gray-900 dark:text-white leading-snug ${href ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''} transition-colors`}>
          {card.title}
        </h3>

        {card.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {card.description}
          </p>
        )}
      </div>

      {href && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
          <span>{card.linkText || (isExternal ? 'Learn more' : 'Read details')}</span>
          {isExternal ? (
            <FaExternalLinkAlt className="w-3.5 h-3.5" />
          ) : (
            <FaArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          )}
        </div>
      )}
    </div>
  );

  if (!href) return cardContent;

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {cardContent}
      </a>
    );
  }

  if (isAnchor) {
    return (
      <a href={href} className="block h-full">
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={href} className="block h-full">
      {cardContent}
    </Link>
  );
}

function DynamicCardGrid({ block }) {
  const cards = Array.isArray(block.cards?.data ?? block.cards) ? (block.cards?.data ?? block.cards) : [];
  const cols =
    block.columns === '2'
      ? 'sm:grid-cols-2'
      : block.columns === '4'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="my-8 space-y-6">
      {(block.heading || block.subheading) && (
        <div className="text-center max-w-3xl mx-auto space-y-2">
          {block.heading && (
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {block.heading}
            </h2>
          )}
          {block.subheading && (
            <p className="text-base text-gray-600 dark:text-gray-400">
              {block.subheading}
            </p>
          )}
        </div>
      )}

      <div className={`grid gap-6 grid-cols-1 ${cols}`}>
        {cards.map((card, idx) => (
          <DynamicCard key={`card-${idx}`} card={card?.attributes ?? card} />
        ))}
      </div>
    </section>
  );
}

function DynamicCta({ block }) {
  const theme = block.theme || 'blue';

  const themeStyles = {
    blue: 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-xl',
    gradient: 'bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white shadow-xl border border-white/10',
    gray: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 shadow-md',
  };

  const isLight = theme === 'gray';

  return (
    <section className={`my-8 rounded-2xl p-8 md:p-10 ${themeStyles[theme] || themeStyles.blue} relative overflow-hidden`}>
      <div className="relative z-10 max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
          {block.title}
        </h2>
        {block.description && (
          <p className={`mt-3 text-base md:text-lg leading-relaxed ${isLight ? 'text-gray-600 dark:text-gray-300' : 'text-blue-100'}`}>
            {block.description}
          </p>
        )}

        {(block.primaryButtonText || block.secondaryButtonText) && (
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            {block.primaryButtonText && block.primaryButtonUrl && (
              <CtaButton
                href={block.primaryButtonUrl}
                label={block.primaryButtonText}
                primary={true}
                isLight={isLight}
              />
            )}
            {block.secondaryButtonText && block.secondaryButtonUrl && (
              <CtaButton
                href={block.secondaryButtonUrl}
                label={block.secondaryButtonText}
                primary={false}
                isLight={isLight}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DynamicSeparator({ block }) {
  const anchorId = String(block.anchorId || '').trim().replace(/^#/, '');
  const style = block.style || 'heading';

  return (
    <section
      id={anchorId || undefined}
      className={`scroll-mt-24 ${style === 'spacer' ? 'h-8' : 'pt-4'}`}
      aria-label={block.label || undefined}
    >
      {style === 'heading' && (
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {block.label}
          </h2>
          {block.subheading && (
            <p className="text-base text-gray-600 dark:text-gray-400">{block.subheading}</p>
          )}
          <div className="h-px bg-gray-200 dark:bg-gray-800" />
        </div>
      )}
      {style === 'line' && <div className="h-px bg-gray-200 dark:bg-gray-800" />}
    </section>
  );
}

function CtaButton({ href, label, primary, isLight }) {
  const isExternal = /^https?:\/\//i.test(href) || href.startsWith('//');

  let btnClasses = '';
  if (primary) {
    btnClasses = isLight
      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
      : 'bg-white text-blue-900 hover:bg-blue-50 shadow-md font-semibold';
  } else {
    btnClasses = isLight
      ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20';
  }

  const content = (
    <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${btnClasses}`}>
      <span>{label}</span>
      {isExternal ? <FaExternalLinkAlt className="w-3.5 h-3.5" /> : <FaArrowRight className="w-3.5 h-3.5" />}
    </span>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return <Link href={href}>{content}</Link>;
}

function DynamicFocusItem({ block }) {
  return (
    <div className="my-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {block.title}
      </h3>
      {block.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4">{block.description}</p>
      )}
      {block.richContent && (
        <RichMarkdown content={block.richContent} />
      )}
    </div>
  );
}

export default function DynamicZone({ blocks, className = '' }) {
  useEffect(() => {
    const anchorId = window.location.hash.slice(1);
    if (!anchorId) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(anchorId))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [blocks]);

  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const markdownClassName = `prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 ${className}`.trim();

  return (
    <div className="space-y-8 w-full">
      {blocks.map((block, index) => {
        if (!block) return null;

        switch (block.__component) {
          case 'shared.card':
            return <DynamicCard key={`card-${index}`} card={block} />;

          case 'shared.card-grid':
            return <DynamicCardGrid key={`cg-${index}`} block={block} />;

          case 'shared.cta':
            return <DynamicCta key={`cta-${index}`} block={block} />;

          case 'shared.separator':
            return <DynamicSeparator key={`separator-${index}`} block={block} />;

          case 'shared.focus-item':
            return <DynamicFocusItem key={`fi-${index}`} block={block} />;

          case 'shared.rich-text':
            return (
              <RichMarkdown
                key={`rt-${index}`}
                content={block.body}
                className={markdownClassName}
              />
            );

          case 'shared.section':
            return (
              <section key={`sec-${index}`} className="space-y-4">
                {block.heading && (
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {block.heading}
                  </h2>
                )}
                {block.subheading && (
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 text-balance leading-snug">
                    {block.subheading}
                  </h3>
                )}
                <RichMarkdown
                  content={block.body}
                  className={markdownClassName}
                />
                
                {block.media && (
                  <div className="mt-6">
                    <BodyContentImage
                      src={resolveMediaUrl(block.media)}
                      srcSet={resolveMediaSrcSet(block.media)}
                      sizes="(max-width: 1024px) 100vw, 800px"
                      alt={block.media.alt || block.media.alternativeText || block.heading || ''}
                      className="rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 mx-auto"
                    />
                    {block.media.caption && (
                      <p className="text-sm text-center text-gray-500 mt-2">{block.media.caption}</p>
                    )}
                  </div>
                )}
              </section>
            );

          case 'shared.quote':
            return (
              <blockquote
                key={`quote-${index}`}
                className="my-8 pl-6 border-l-4 border-blue-600 dark:border-blue-400 italic text-xl text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-r-2xl shadow-sm"
              >
                <p>{block.body || block.quote}</p>
                {(block.title || block.author) && (
                  <footer className="mt-4 text-sm not-italic font-semibold text-gray-600 dark:text-gray-400">
                    — {block.title || block.author}
                  </footer>
                )}
              </blockquote>
            );

          case 'shared.media':
            {
              const mediaData = block.file || block.media || block;
              const mediaSrc = resolveMediaUrl(mediaData);
              if (!mediaSrc) return null;
              
              const mimeStr = mediaData.mime || mediaData.data?.attributes?.mime;
              const isVideo = mimeStr?.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(mediaSrc);

              return (
                <div key={`media-${index}`} className="my-8 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  {isVideo ? (
                    <MediaPlayer
                      media={{ url: mediaSrc, mime: mimeStr, caption: mediaData.caption || block.caption }}
                      alt={mediaData.alt || mediaData.alternativeText || block.caption || ''}
                    />
                  ) : (
                    <>
                      <BodyContentImage
                        src={mediaSrc}
                        srcSet={resolveMediaSrcSet(mediaData)}
                        sizes="(max-width: 1024px) 100vw, 800px"
                        alt={mediaData.alt || mediaData.alternativeText || block.caption || ''}
                      />
                      {(mediaData.caption || block.caption) && (
                        <p className="text-sm text-center text-gray-500 p-3 bg-white dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
                          {mediaData.caption || block.caption}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            }

          case 'shared.media-player':
          case 'shared.video':
            {
              const mediaData = block.file || block.media || block.video || block;
              const mediaSrc = resolveMediaUrl(mediaData);
              if (!mediaSrc) return null;
              
              const mimeStr = mediaData.mime || mediaData.data?.attributes?.mime;

              return (
                <div key={`player-${index}`} className="my-8 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  <MediaPlayer 
                    media={{ url: mediaSrc, mime: mimeStr, caption: mediaData.caption || block.caption }} 
                    alt={mediaData.alt || mediaData.alternativeText || block.caption || ''}
                  />
                </div>
              );
            }

          case 'shared.slider':
            {
              const files = Array.isArray(block.files) ? block.files : block.media ? block.media : [];
              const imageItems = files
                .map((file) => ({
                  ...file,
                  url: resolveMediaUrl(file),
                  srcSet: resolveMediaSrcSet(file),
                }))
                .filter((file) => file.url);
              if (imageItems.length === 0) return null;
              
              if (imageItems.length === 1) {
                const singleFile = imageItems[0];
                const mimeStr = singleFile?.mime || singleFile?.data?.attributes?.mime;
                return (
                  <div key={`slide-${index}`} className="my-8 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <MediaPlayer
                      media={{ url: singleFile.url, mime: mimeStr, caption: singleFile.caption }}
                      alt={singleFile.alt || 'Slide'}
                    />
                  </div>
                );
              }

              return (
                <div key={`slider-${index}`} className="my-8">
                  <GallerySlideshow images={imageItems} />
                </div>
              );
            }

          default:
            return null;
        }
      })}
    </div>
  );
}
