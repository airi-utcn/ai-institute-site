/**
 * Responsive image helpers shared by the server-side Strapi transforms and by
 * client components.
 *
 * These helpers are intentionally pure (no env access) so the same module can
 * be imported from server and client bundles.
 *
 * Why this exists: Strapi already generates resized variants for every upload
 * (`thumbnail`, `small`, `medium`, `large`) and exposes their widths. Emitting
 * a `srcset` from those variants lets the browser download a right-sized file
 * without sending the image through Next's optimizer — which cannot reach the
 * public Strapi hostname from inside the web container (hairpin NAT).
 */

/** Preferred order when walking Strapi's generated formats. */
export const STRAPI_FORMAT_ORDER = ['thumbnail', 'small', 'medium', 'large'];

/**
 * Build a `srcset` string from a normalized media object
 * (`{ url, width, formats }`) or a plain URL string.
 *
 * Returns an empty string when no usable width metadata is available, so it is
 * always safe to spread onto an `<img>`.
 */
export function buildImageSrcSet(media) {
  if (!media) return '';

  const url = typeof media === 'string' ? media : media.url;
  if (!url || typeof url !== 'string') return '';

  const formats = typeof media === 'string' ? null : media.formats;
  const originalWidth = typeof media === 'string' ? null : media.width;

  const candidates = new Map();
  let largestFormatWidth = 0;

  if (formats && typeof formats === 'object') {
    for (const key of STRAPI_FORMAT_ORDER) {
      const format = formats[key];
      const width = Number(format?.width);
      if (format?.url && width > 0) {
        candidates.set(width, format.url);
        if (width > largestFormatWidth) largestFormatWidth = width;
      }
    }
  }

  const fullWidth = Number(originalWidth);
  const maxOriginalWidth = Math.max(largestFormatWidth * 2, 1600);
  if (fullWidth > 0 && candidates.size === 0) {
    // No resized variants: the original is the only candidate.
    candidates.set(fullWidth, url);
  } else if (fullWidth > 0 && fullWidth <= maxOriginalWidth) {
    // Only keep the original when it is a sensible step above the largest
    // generated format. Strapi's largest default format is 1000w, while an
    // original can be 4000w+; including that gap makes browsers jump straight
    // from a ~1000px layout to a multi-megabyte original. Dropping it keeps
    // those layouts on the largest generated variant instead.
    candidates.set(fullWidth, url);
  }

  if (candidates.size === 0) return '';

  return Array.from(candidates.entries())
    .sort(([widthA], [widthB]) => widthA - widthB)
    .map(([width, candidateUrl]) => `${candidateUrl} ${width}w`)
    .join(', ');
}

/**
 * Build a `srcset` from raw Strapi `formats`, resolving relative format URLs
 * with the caller-provided resolver (e.g. prefixing the public Strapi base).
 */
export function buildSrcSetFromFormats({ url, formats, width, resolveUrl } = {}) {
  if (!url) return '';
  if (!formats || typeof formats !== 'object') return '';

  const resolve = typeof resolveUrl === 'function' ? resolveUrl : (value) => value;
  const resolvedFormats = {};

  for (const [key, format] of Object.entries(formats)) {
    if (!format?.url) continue;
    resolvedFormats[key] = { ...format, url: resolve(format.url) || format.url };
  }

  return buildImageSrcSet({ url, formats: resolvedFormats, width });
}

/**
 * `sizes` for a card that sits in a responsive grid.
 *
 * @param {object} [options]
 * @param {number} [options.columns=3] Largest column count of the grid.
 * @param {number} [options.containerWidth=1280] Max width of the grid, in px.
 */
export function gridSizes({ columns = 3, containerWidth = 1280 } = {}) {
  const safeColumns = Math.max(columns, 1);
  const parts = ['(max-width: 640px) 100vw'];
  if (safeColumns >= 2) parts.push('(max-width: 1024px) 50vw');
  parts.push(`(max-width: ${containerWidth}px) ${Math.round(100 / safeColumns)}vw`);
  parts.push(`${Math.round(containerWidth / safeColumns)}px`);
  return parts.join(', ');
}

/**
 * `sizes` for a full-width hero capped by its container.
 *
 * @param {number} [containerWidth=1200] Max width of the hero, in px.
 */
export function heroSizes(containerWidth = 1200) {
  return `(max-width: ${containerWidth}px) 100vw, ${containerWidth}px`;
}
