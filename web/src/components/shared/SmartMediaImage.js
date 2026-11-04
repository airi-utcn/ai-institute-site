'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * SmartMediaImage
 *
 * Solves the cropping issue in landscape containers:
 * - Wide images: Render full-bleed object-cover with optional focalPoint alignment.
 * - Square/portrait images: Render 100% in view (object-contain) centered over an ambient,
 *   frosted-glass backdrop blur sampled from the image itself.
 *   This prevents awkward crops (e.g. only the middle of a portrait, or just a nose)
 *   and ensures every piece of media displays with pride.
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

  const [isNarrow, setIsNarrow] = useState(false);
  const [narrowSrc, setNarrowSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);
  const imgRef = useRef(null);

  const hasError = Boolean(srcUrl) && failedSrc === srcUrl;
  const showAmbientBackdrop = !hasError && narrowSrc === srcUrl && isNarrow;

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

  const containerClasses = `relative w-full overflow-hidden bg-gray-100 dark:bg-gray-900 ${aspectRatio} ${className}`.trim();

  const renderFallback = () => (
    <div
      className={`${containerClasses} ${fallbackClassName}`.trim()}
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

  const focalStyle = focalPoint?.x != null && focalPoint?.y != null
    ? { objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }
    : undefined;

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
        style={!showAmbientBackdrop ? focalStyle : undefined}
        className={`relative z-10 w-full h-full transition-all duration-300 ${
          showAmbientBackdrop
            ? 'object-contain p-2 drop-shadow-md'
            : 'object-cover'
        } ${imageClassName}`.trim()}
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
