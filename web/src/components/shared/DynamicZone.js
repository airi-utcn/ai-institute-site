'use client';

import RichMarkdown from '@/components/shared/RichMarkdown';
import BodyContentImage from '@/components/shared/BodyContentImage';
import MediaPlayer from '@/components/shared/MediaPlayer';
import GallerySlideshow from '@/components/shared/GallerySlideshow';

const resolveMediaUrl = (media) => {
  if (!media) return null;
  let url = '';
  if (typeof media === 'string') {
    url = media;
  } else {
    url = media.url || media.src || media.data?.attributes?.url || '';
  }
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  
  const baseUrl = (process.env.NEXT_PUBLIC_STRAPI_URL || '').replace(/\/+$/, '');
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function DynamicZone({ blocks, className = '' }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const markdownClassName = `prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 ${className}`.trim();

  return (
    <div className="space-y-8 w-full">
      {blocks.map((block, index) => {
        if (!block) return null;

        switch (block.__component) {
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
                      alt={block.media.alternativeText || block.heading || ''}
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
              console.log("DYNAMICZONE: ", { isVideo, mediaSrc, mimeStr });

              return (
                <div key={`media-${index}`} className="my-8 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  {isVideo ? (
                    <MediaPlayer 
                      media={{ url: mediaSrc, mime: mimeStr, caption: mediaData.caption || block.caption }} 
                      alt={mediaData.alternativeText || block.caption || ''} 
                    />
                  ) : (
                    <>
                      <BodyContentImage
                        src={mediaSrc}
                        alt={mediaData.alternativeText || block.caption || ''}
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
                    alt={mediaData.alternativeText || block.caption || ''} 
                  />
                </div>
              );
            }

          case 'shared.slider':
            {
              const files = Array.isArray(block.files) ? block.files : block.media ? block.media : [];
              const images = files.map(f => resolveMediaUrl(f)).filter(Boolean);
              if (images.length === 0) return null;
              
              // Depending on requirements, we can use a Slideshow or Stack.
              // Let's use GallerySlideshow if there's more than one, else BodyContentImage
              if (images.length === 1) {
                const singleFile = files[0];
                const mimeStr = singleFile?.mime || singleFile?.data?.attributes?.mime;
                return (
                  <div key={`slide-${index}`} className="my-8 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <MediaPlayer media={{ url: images[0], mime: mimeStr }} alt="Slide" />
                  </div>
                );
              }

              return (
                <div key={`slider-${index}`} className="my-8">
                  <GallerySlideshow images={images} />
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
