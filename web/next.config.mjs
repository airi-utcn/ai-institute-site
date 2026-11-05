/** @type {import('next').NextConfig} */
const envStrapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.PUBLIC_STRAPI_URL || '';

const toRemotePattern = (rawUrl) => {
  try {
    if (!rawUrl) return null;
    const parsed = new URL(rawUrl);
    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      pathname: '/**',
    };
  } catch {
    return null;
  }
};

const envPattern = toRemotePattern(envStrapiUrl);

const strapiOrigin = (() => {
  try {
    return envStrapiUrl ? new URL(envStrapiUrl).origin : null;
  } catch {
    return null;
  }
})();

const isLocalHost = (() => {
  try {
    if (!envStrapiUrl) return false;
    const parsed = new URL(envStrapiUrl);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
})();

const remotePatterns = [
  // Local dev (host)
  { protocol: 'http', hostname: 'localhost', port: '1337', pathname: '/**' },
  { protocol: 'http', hostname: '127.0.0.1', port: '1337', pathname: '/**' },
  { protocol: 'http', hostname: '0.0.0.0', port: '1337', pathname: '/**' },
  { protocol: 'http', hostname: 'host.docker.internal', port: '1337', pathname: '/**' },

  // Docker network (server-to-server)
  { protocol: 'http', hostname: 'strapi', port: '1337', pathname: '/**' },

  // Production (behind Nginx, often under /strapi)
  { protocol: 'https', hostname: 'airi.utcluj.ro', pathname: '/**' },
  // flickr cdn images
  { protocol: 'https', hostname: 'live.staticflickr.com', pathname: '/**' },
  { protocol: 'https', hostname: '*.staticflickr.com', pathname: '/**' },
  ...(envPattern ? [envPattern] : []),
];

const isStaticBuild = process.env.STATIC_BUILD === 'true';

// The Strapi admin embeds the frontend in an iframe for previews. Allow the
// configured Strapi origin in addition to the local and production defaults.
const frameAncestors = [
  "'self'",
  'http://localhost:1337',
  'https://airi.utcluj.ro',
  strapiOrigin,
]
  .filter(Boolean)
  .filter((value, index, values) => values.indexOf(value) === index)
  .join(' ');

const nextConfig = {
  trailingSlash: false,
  // basePath: "/icia-staging",
  ...(isStaticBuild ? { output: 'export' } : {}),
  images: {
    remotePatterns,
    ...(isStaticBuild || isLocalHost ? { unoptimized: true } : {}),
  },
  // redirects for shorthand and legacy urls to prevent 404s
  async redirects() {
    return [
      {
        source: '/news',
        destination: '/news&events/news',
        permanent: true,
      },
      {
        source: '/news&events',
        destination: '/news&events/news',
        permanent: true,
      },
      {
        source: '/events',
        destination: '/news&events/events',
        permanent: true,
      },
      {
        source: '/engagement/academic',
        destination: '/engagement?tab=academic',
        permanent: true,
      },
      {
        source: '/engagement/industry',
        destination: '/engagement?tab=industry',
        permanent: true,
      },
      {
        source: '/engagement/high-school',
        destination: '/engagement?tab=high-school',
        permanent: true,
      },
      {
        source: '/engagement/industrial-phd',
        destination: '/engagement?tab=industry',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors}`,
          },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // The preview entry URL contains the shared secret. Never forward it
        // to the redirected page as a Referer.
        source: '/api/preview',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },
};

export default nextConfig;
