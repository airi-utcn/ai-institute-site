const MATTERPORT_HOSTS = new Set([
  'matterport.com',
  'www.matterport.com',
  'my.matterport.com',
]);

const MATTERPORT_MODEL_ID = /^[A-Za-z0-9]{6,32}$/;

/**
 * Return a trimmed http(s) URL, or an empty string for anything else.
 * This keeps arbitrary CMS values out of href/src attributes.
 */
export function normalizeExternalUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return '';

  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (parsed.username || parsed.password) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

/**
 * Turn a Matterport share URL into the URLs needed by the page.
 * Returns null when the value is not a public Matterport share URL.
 */
export function parseMatterportUrl(rawUrl) {
  const normalized = normalizeExternalUrl(rawUrl);
  if (!normalized) return null;

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  if (!MATTERPORT_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  const modelId = (parsed.searchParams.get('m') || '').trim();
  if (!MATTERPORT_MODEL_ID.test(modelId)) return null;

  const encodedId = encodeURIComponent(modelId);
  const thumbnailBase = `https://my.matterport.com/api/v2/player/models/${encodedId}/thumb`;

  return {
    modelId,
    url: `https://my.matterport.com/show/?m=${encodedId}`,
    embedUrl: `https://my.matterport.com/show/?m=${encodedId}&play=1&qs=1&title=0`,
    // Public player thumbnail used as the lightweight cover image.
    thumbnailUrl: `${thumbnailBase}?width=1600`,
    thumbnailSrcSet: `${thumbnailBase}?width=800 800w, ${thumbnailBase}?width=1200 1200w, ${thumbnailBase}?width=1600 1600w`,
  };
}
