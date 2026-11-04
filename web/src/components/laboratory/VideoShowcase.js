'use client';

import { useState } from 'react';
import { FaPlay, FaVideo, FaExternalLinkAlt } from 'react-icons/fa';

function getEmbedUrl(url) {
  if (!url) return null;
  const str = String(url).trim();

  // YouTube standard watch or short url
  const ytMatch = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }

  // Vimeo
  const vimeoMatch = str.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  return null;
}

/**
 * VideoShowcase
 *
 * Renders an uploaded video, a direct video URL, or an embed (YouTube/Vimeo)
 * behind a poster cover.
 *
 * The player is only mounted after the visitor presses play. Mounting an embed
 * up-front would let it autoplay underneath the cover (the embed URLs request
 * autoplay), and even a local <video> would show its native controls through a
 * translucent cover. Until then only the opaque poster and play button exist.
 */
export default function VideoShowcase({
  videoFile,
  videoUrl,
  poster,
  title,
  description,
  className = '',
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const videoSrc = typeof videoFile === 'string' ? videoFile : videoFile?.url;
  const caption = typeof videoFile === 'object' ? videoFile?.caption : '';
  const posterSrc = typeof poster === 'string' ? poster : poster?.url;
  const posterAlt = typeof poster === 'object' ? poster?.alt : '';
  const posterSrcSet = typeof poster === 'object' ? poster?.srcSet : '';
  const embedUrl = getEmbedUrl(videoUrl);
  const isDirectUrl = !embedUrl && videoUrl && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(videoUrl);
  const resolvedDirectSrc = videoSrc || (isDirectUrl ? videoUrl : null);

  // If there's neither an uploaded video nor a valid video URL
  if (!resolvedDirectSrc && !embedUrl && !videoUrl) {
    return null;
  }

  const playLabel = title ? `Play video: ${title}` : 'Play video';

  return (
    <div className={`relative my-8 ${className}`}>
      {/* Cinematic ambient glow */}
      <div
        className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/25 via-indigo-500/20 to-purple-600/25 rounded-3xl blur-xl opacity-70 dark:opacity-50 -z-10"
        aria-hidden="true"
      />

      <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-800 bg-black shadow-2xl">
        <div className="relative aspect-video w-full overflow-hidden bg-gray-950">
          {!isPlaying ? (
            // Poster cover. A single button keeps the whole cover clickable and
            // makes sure the player below is not mounted (and cannot autoplay).
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              aria-label={playLabel}
              className="group absolute inset-0 z-20 block h-full w-full text-left"
            >
              <span
                className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black"
                aria-hidden="true"
              />
              {posterSrc && (
                <img
                  src={posterSrc}
                  srcSet={posterSrcSet || undefined}
                  sizes="(max-width: 1024px) 100vw, 1000px"
                  alt={posterAlt || title || 'Video preview'}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <span
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                aria-hidden="true"
              />
              <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-2xl ring-4 ring-white/30 backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500 sm:h-20 sm:w-20">
                  <FaPlay className="ml-1 h-6 w-6 sm:h-7 sm:w-7" />
                </span>
              </span>
              <span className="absolute bottom-4 left-4 right-4 text-white sm:bottom-6 sm:left-6 sm:right-6">
                <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold text-blue-300 backdrop-blur-md">
                  <FaVideo className="h-3 w-3" />
                  <span>Lab Tour Video</span>
                </span>
                {title && (
                  <span className="block text-lg font-bold tracking-tight text-white drop-shadow-md sm:text-xl md:text-2xl">
                    {title}
                  </span>
                )}
              </span>
            </button>
          ) : resolvedDirectSrc ? (
            <video
              src={resolvedDirectSrc}
              poster={posterSrc || undefined}
              controls
              autoPlay
              preload="metadata"
              className="absolute inset-0 h-full w-full object-contain"
            >
              Your browser does not support HTML5 video.
            </video>
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              title={title || 'Presenting Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            // Generic external link if embed URL couldn't be parsed
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
              <p className="mb-4 text-gray-300">External video presentation available.</p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg"
              >
                <span>Watch Video Presentation</span>
                <FaExternalLinkAlt className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Video metadata footer */}
        {isPlaying && (title || description || caption) && (
          <div className="p-4 sm:p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            {title && (
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {description}
              </p>
            )}
            {caption && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                {caption}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
