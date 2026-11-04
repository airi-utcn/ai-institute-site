/**
 * HeroHeader
 *
 * Shared translucent page hero modelled on the Laboratories index header:
 * the image sits behind the content at low opacity and fades into the page
 * background. Because the image is a decorative backdrop rather than a
 * fixed-height cover crop, portraits and wide group photos no longer lose
 * heads/torsos to an aggressive banner aspect ratio.
 *
 * Square/portrait media would still be cropped badly by `object-cover` in a
 * wide hero (e.g. only the middle of a portrait, or just a nose). When the
 * intrinsic dimensions are known and the image is not wide, the whole image is
 * shown (`object-contain`) over a blurred, low-opacity copy of itself.
 *
 * The same component is used on listing headers and on article/event/lab/
 * project detail headers, so every hero has the same treatment.
 *
 * The image is decorative (the page heading carries the meaning), so it is
 * always hidden from assistive technology.
 */
export default function HeroHeader({
  image,
  srcSet,
  focalPoint,
  width,
  height,
  children,
  className = '',
  contentClassName = 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8',
  imageClassName = '',
  backgroundClassName = 'bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-gray-900/40 dark:via-[#0a0a0a] dark:to-[#0a0a0a]',
  overlayClassName = 'bg-gradient-to-b from-white/30 via-white/75 to-white dark:from-gray-950/40 dark:via-gray-950/80 dark:to-[#0a0a0a]',
  priority = false,
}) {
  const hasImage = Boolean(image);
  const isNarrow = Boolean(width > 0 && height > 0 && height / width >= 0.85);
  const objectPosition =
    focalPoint?.x != null && focalPoint?.y != null
      ? `${focalPoint.x}% ${focalPoint.y}%`
      : undefined;

  const imageLoading = priority ? 'eager' : 'lazy';
  const imageFetchPriority = priority ? 'high' : 'low';
  const fadeEdges = isNarrow
    ? {
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }
    : null;

  return (
    <section
      className={`relative overflow-hidden border-b border-gray-100 dark:border-gray-900 ${backgroundClassName} ${className}`.trim()}
    >
      {hasImage && (
        <>
          {isNarrow ? (
            <>
              <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                <img
                  src={image}
                  srcSet={srcSet || undefined}
                  alt=""
                  loading={imageLoading}
                  fetchPriority="low"
                  decoding="async"
                  className="w-full h-full object-cover blur-2xl scale-110 opacity-40 dark:opacity-30"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
              >
                <img
                  src={image}
                  srcSet={srcSet || undefined}
                  alt=""
                  loading={imageLoading}
                  fetchPriority={imageFetchPriority}
                  decoding="async"
                  style={fadeEdges}
                  className={`h-full w-auto max-w-full object-contain opacity-30 dark:opacity-25 ${imageClassName}`.trim()}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </>
          ) : (
            <img
              src={image}
              srcSet={srcSet || undefined}
              alt=""
              aria-hidden="true"
              loading={imageLoading}
              fetchPriority={imageFetchPriority}
              decoding="async"
              style={objectPosition ? { objectPosition } : undefined}
              className={`absolute inset-0 w-full h-full object-cover opacity-30 dark:opacity-25 ${imageClassName}`.trim()}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className={`absolute inset-0 ${overlayClassName}`.trim()} aria-hidden="true" />
        </>
      )}

      <div className={`relative z-10 ${contentClassName}`.trim()}>{children}</div>
    </section>
  );
}
