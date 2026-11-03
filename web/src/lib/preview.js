export const ALLOWED_STATIC_PATHS = new Set([
  '/engagement',
  '/research/departments',
]);

export const ALLOWED_PATH_PATTERNS = [
  /^\/research\/projects\/[^/?#]+$/,
  /^\/research\/departments\/[^/?#]+$/,
];

export function isAllowedPreviewPath(path) {
  if (!path || typeof path !== 'string') return false;
  // Security check: must start with single '/' to prevent open redirects (e.g. //attacker.com)
  if (!path.startsWith('/') || path.startsWith('//')) return false;

  const pathname = path.split('?')[0].split('#')[0];
  if (ALLOWED_STATIC_PATHS.has(pathname)) return true;
  return ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

// Kept for backward compatibility
export const PREVIEW_PATHS = ALLOWED_STATIC_PATHS;
