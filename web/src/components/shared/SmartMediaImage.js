'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * SmartMediaImage
 *
 * Solves the portrait cropping issue in landscape containers:
 * - Landscape images: Render full-bleed object-cover with optional focalPoint alignment.
 * - Portrait images: Render 100% in view (object-contain) centered over an ambient,
 *   frosted-glass backdrop blur sampled from the image itself.
 *   This prevents awkward top-crops (e.g., only forehead/hair visible) and ensures
 *   every piece of media displays with pride.
 *
 * Missing or broken images can render a caller-provided `fallback` element instead
 * of the browser's broken-image icon. The fallback is also used when the image
 * failed before hydration (where React's onError never fires).
 */
export default function SmartMediaImage({
  src,
  alt = '',
  aspectRatio = 'aspect-video',
  className = '',
  imageClassName = '',
  focalPoint = null,
  priority = false,
  loading = 'lazy',
  fallback = null,
  fallbackClassName = '',
  children,
  onError,
  ...props
}) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [portraitSrc, setPortraitSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);
  const imgRef = useRef(null);

  const hasError = Boolean(src) && failedSrc === src;
  const showAmbientBackdrop = !hasError && portraitSrc === src && isPortrait;

  useEffect(() => {
    const img = imgRef.current;
    if (!img?.complete) return;

    if (img.naturalWidth === 0) {
      setFailedSrc(src);
      return;
    }

    if (img.naturalWidth && img.naturalHeight) {
      setIsPortrait(img.naturalHeight > img.naturalWidth);
      setPortraitSrc(src);
    }
  }, [src]);

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
      {children && <div className="relative z-20">{children}</div>}
    </div>
  );

  if (!src) {
    return fallback ? renderFallback() : null;
  }

  if (hasError) {
    return renderFallback();
  }

  const handleLoad = (event) => {
    const img = event.currentTarget;
    if (img?.naturalWidth && img?.naturalHeight) {
      setIsPortrait(img.naturalHeight > img.naturalWidth);
      setPortraitSrc(src);
    }
  };

  const handleError = (event) => {
    setFailedSrc(src);
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
            src={src}
            alt=""
            className="w-full h-full object-cover blur-2xl opacity-50 dark:opacity-40 scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/10 dark:bg-black/35 backdrop-blur-[1px]" />
        </div>
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : loading}
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
        <div className="relative z-20">
          {children}
        </div>
      )}
    </div>
  );
}
