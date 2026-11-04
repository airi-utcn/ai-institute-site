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

  return (
    <div className={`relative my-8 ${className}`}>
      {/* Cinematic ambient glow */}
      <div 
        className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/25 via-indigo-500/20 to-purple-600/25 rounded-3xl blur-xl opacity-70 dark:opacity-50 -z-10" 
        aria-hidden="true" 
      />

      <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-800 bg-black shadow-2xl">
        <div className="relative aspect-video w-full overflow-hidden bg-gray-950 flex items-center justify-center">
          {/* If user hasn't clicked play yet and we have a poster, show cinematic cover */}
          {!isPlaying && posterSrc && (
            <div className="absolute inset-0 z-20 cursor-pointer group" onClick={() => setIsPlaying(true)}>
              <img
                src={posterSrc}
                srcSet={posterSrcSet || undefined}
                sizes="(max-width: 1024px) 100vw, 1000px"
                alt={posterAlt || title || 'Video preview'}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Play video"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transform transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500 ring-4 ring-white/30"
                >
                  <FaPlay className="w-6 h-6 sm:w-7 sm:h-7 ml-1" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white pointer-events-none">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-md text-blue-300 border border-white/10 mb-2">
                  <FaVideo className="w-3 h-3" />
                  <span>Lab Tour Video</span>
                </div>
                {title && (
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-md">
                    {title}
                  </h3>
                )}
              </div>
            </div>
          )}

          {/* Player rendering */}
          {resolvedDirectSrc ? (
            <video
              src={resolvedDirectSrc}
              poster={posterSrc}
              controls
              autoPlay={isPlaying}
              preload="metadata"
              className="w-full h-full object-contain"
            >
              <track kind="captions" />
              Your browser does not support HTML5 video.
            </video>
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              title={title || 'Presenting Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : videoUrl ? (
            // Generic external link if embed URL couldn't be parsed
            <div className="p-8 text-center text-white">
              <p className="text-gray-300 mb-4">External video presentation available.</p>
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
          ) : null}
        </div>

        {/* Video metadata footer */}
        {(title || description || caption) && (!posterSrc || isPlaying) && (
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
