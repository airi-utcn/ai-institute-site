export const RSS_ALTERNATE = {
  'application/rss+xml': '/rss.xml',
};

/**
 * Build page-level alternates without dropping the site-wide RSS link.
 * Next replaces the whole `alternates` object when a page defines it.
 */
export function canonical(path) {
  return {
    canonical: path,
    types: RSS_ALTERNATE,
  };
}
