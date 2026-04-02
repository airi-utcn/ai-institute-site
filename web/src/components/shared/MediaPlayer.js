'use client';

import { useState } from 'react';

export default function MediaPlayer({ 
  media, 
  alt = '', 
  className = '',
  portraitClassName = 'mx-auto w-auto max-w-full max-h-[60vh] object-contain',
  landscapeClassName = 'w-full h-auto object-cover',
  loading = 'lazy',
  ...props 
}) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMeasured, setIsMeasured] = useState(false);

  // Handle both string URLs and media objects
  const src = typeof media === 'string' ? media : media?.url;
  const mime = typeof media === 'object' ? media?.mime : '';
  const caption = typeof media === 'object' ? media?.caption : '';
  const mediaAlt = typeof media === 'object' ? (media?.alt || alt) : alt;

  if (!src) return null;

  const isVideo = mime && (mime.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(src));
  const isImage = !isVideo;

  const onLoad = (event) => {
    const element = event.currentTarget;
    if (element?.naturalHeight && element?.naturalWidth) {
      setIsPortrait(element.naturalHeight > element.naturalWidth);
      setIsMeasured(true);
    } else if (element?.videoHeight && element?.videoWidth) {
      setIsPortrait(element.videoHeight > element.videoWidth);
      setIsMeasured(true);
    }
  };

  const modeClass = !isMeasured 
    ? landscapeClassName 
    : isPortrait 
    ? portraitClassName 
    : landscapeClassName;

  const finalClassName = `${className} ${modeClass}`.trim();

  if (isVideo) {
    return (
      <div className="media-player-wrapper">
        <video
          src={src}
          controls
          preload="metadata"
          onLoadedMetadata={onLoad}
          className={finalClassName}
          {...props}
        >
          <track kind="captions" />
          Your browser does not support the video tag.
        </video>
        {caption && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center italic">
            {caption}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="media-player-wrapper">
      <img
        src={src}
        alt={mediaAlt}
        loading={loading}
        onLoad={onLoad}
        className={finalClassName}
        {...props}
      />
      {caption && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center italic">
          {caption}
        </p>
      )}
    </div>
  );
}
