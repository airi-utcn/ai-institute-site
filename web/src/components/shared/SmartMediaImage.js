'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * SmartMediaImage
 *
 * Solves image cropping inside responsive media frames:
 * - `fit="smart"` (default): wide images render full-bleed with `object-cover`
 *   and optional focalPoint alignment; square/portrait images are shown whole
 *   (`object-contain`) over an ambient, frosted-glass backdrop sampled from the
 *   image itself.
 * - `fit="cover"`: always full-bleed with `object-cover` (focalPoint aware).
 * - `fit="contain"`: always show the whole image over the ambient backdrop.
 *   Used by cards whose subjects use very different aspect ratios.
 * - `fit="natural"`: no fixed frame at all. The image keeps its intrinsic
 *   aspect ratio and can grow as tall as it needs, capped only by
 *   `naturalMaxHeightClassName`; the ambient backdrop fills any side space.
 *
 * Missing or broken images can render a caller-provided `fallback` element instead
 * of the browser's broken-image icon. The fallback is also used when the image
 * failed before hydration (where React's onError never fires).
 */
export default function SmartMediaImage({
  src,
  srcSet,
  alt = '',
  aspectRatio = 'aspect-video',
  fit = 'smart',
  width,
  height,
  naturalMaxHeightClassName = 'max-h-[85vh]',
  className = '',
  imageClassName = '',
  focalPoint = null,
  priority = false,
  loading = 'lazy',
  decoding = 'async',
  sizes,
  fallback = null,
  fallbackClassName = '',
  children,
  onError,
  ...props
}) {
  // Accept either a URL string or a media object from `resolveMediaData`
  // (which already carries a ready-to-use `srcSet`).
  const srcUrl = typeof src === 'string' ? src : src?.url || '';
  const resolvedSrcSet =
    srcSet ?? (src && typeof src === 'object' ? src.srcSet : '') ?? '';

  const intrinsicWidth = Number(width ?? (src && typeof src === 'object' ? src.width : 0)) || 0;
  const intrinsicHeight = Number(height ?? (src && typeof src === 'object' ? src.height : 0)) || 0;
  const dimensionsKnown = intrinsicWidth > 0 && intrinsicHeight > 0;

  const [isNarrow, setIsNarrow] = useState(
    () => dimensionsKnown && intrinsicHeight >= intrinsicWidth * 0.85
  );
  const [narrowSrc, setNarrowSrc] = useState(
    () => (dimensionsKnown && srcUrl ? srcUrl : null)
  );
  const [failedSrc, setFailedSrc] = useState(null);
  const imgRef = useRef(null);

  const isNatural = fit === 'natural';
  const hasError = Boolean(srcUrl) && failedSrc === srcUrl;
  const showAmbientBackdrop =
    !hasError &&
    (fit === 'contain' ||
      isNatural ||
      (fit === 'smart' && narrowSrc === srcUrl && isNarrow));

  useEffect(() => {
    const img = imgRef.current;
    if (!img?.complete) return;

    if (img.naturalWidth === 0) {
      setFailedSrc(srcUrl);
      return;
    }

    if (img.naturalWidth && img.naturalHeight) {
      setIsNarrow(img.naturalHeight >= img.naturalWidth * 0.85);
      setNarrowSrc(srcUrl);
    }
  }, [srcUrl]);

  const containerClasses = `relative w-full overflow-hidden bg-gray-100 dark:bg-gray-900 ${
    isNatural ? '' : aspectRatio
  } ${className}`.trim();

  const renderFallback = () => (
    <div
      className={`${containerClasses} ${isNatural ? 'aspect-video' : ''} ${fallbackClassName}`.trim()}
      role={fallback && alt ? 'img' : undefined}
      aria-label={fallback && alt ? alt : undefined}
    >
      {fallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </div>
      )}
      {children && <div className="absolute inset-0 z-20">{children}</div>}
    </div>
  );

  if (!srcUrl) {
    return fallback ? renderFallback() : null;
  }

  if (hasError) {
    return renderFallback();
  }

  const handleLoad = (event) => {
    const img = event.currentTarget;
    if (img?.naturalWidth && img?.naturalHeight) {
      setIsNarrow(img.naturalHeight >= img.naturalWidth * 0.85);
      setNarrowSrc(srcUrl);
    }
  };

  const handleError = (event) => {
    setFailedSrc(srcUrl);
    onError?.(event);
  };

  const focalStyle =
    !showAmbientBackdrop && focalPoint?.x != null && focalPoint?.y != null
      ? { objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }
      : undefined;

  const foregroundClassName = isNatural
    ? `relative z-10 block w-full h-auto ${naturalMaxHeightClassName} object-contain mx-auto transition-all duration-300 ${imageClassName}`.trim()
    : `relative z-10 w-full h-full transition-all duration-300 ${
        showAmbientBackdrop ? 'object-contain p-2 drop-shadow-md' : 'object-cover'
      } ${imageClassName}`.trim();

  return (
    <div className={containerClasses}>
      {showAmbientBackdrop && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <img
            src={srcUrl}
            alt=""
            className="w-full h-full object-cover blur-2xl opacity-50 dark:opacity-40 scale-110"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
          <div className="absolute inset-0 bg-black/10 dark:bg-black/35 backdrop-blur-[1px]" />
        </div>
      )}

      <img
        ref={imgRef}
        src={srcUrl}
        srcSet={resolvedSrcSet || undefined}
        alt={alt}
        loading={priority ? 'eager' : loading}
        fetchPriority={priority ? 'high' : undefined}
        decoding={decoding}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        style={focalStyle}
        className={foregroundClassName}
        {...props}
      />

      {children && (
        <div className="absolute inset-0 z-20">
          {children}
        </div>
      )}
    </div>
  );
}
