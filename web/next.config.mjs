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
const isDev = process.env.NODE_ENV === 'development';

// In development the browser loads Strapi media directly from the local
// Strapi server. It is a different origin from the Next dev server, so it has
// to be listed explicitly in img-src/media-src/connect-src.
const devStrapiOrigins = isDev
  ? [
      'http://localhost:1337',
      'http://127.0.0.1:1337',
      'http://0.0.0.0:1337',
      'http://host.docker.internal:1337',
    ]
  : [];

const withDevStrapiOrigins = (directive) =>
  devStrapiOrigins.length
    ? `${directive} ${devStrapiOrigins.join(' ')}`
    : directive;

// The Strapi admin embeds the frontend in an iframe for previews. Allow the
// configured Strapi origin in addition to the local and production defaults.
const frameAncestors = [
  "'self'",
  ...devStrapiOrigins,
  'https://airi.utcluj.ro',
  strapiOrigin,
]
  .filter(Boolean)
  .filter((value, index, values) => values.indexOf(value) === index)
  .join(' ');

// This is deliberately not a nonce-based policy: the app uses Next's
// beforeInteractive theme script and a third-party LinkedIn widget, and the
// root layout is already dynamic. script-src still blocks unlisted third-party
// scripts, while the JSON-LD renderer escapes its payload separately.
// A future step is a nonce in proxy.js and dropping 'unsafe-inline'.
const contentSecurityPolicy = [
  "default-src 'self' https: data: blob:",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://widgets.sociablekit.com`,
  "style-src 'self' 'unsafe-inline'",
  withDevStrapiOrigins("img-src 'self' data: blob: https:"),
  "font-src 'self' data:",
  withDevStrapiOrigins("connect-src 'self' https:"),
  withDevStrapiOrigins("media-src 'self' https:"),
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-ancestors ${frameAncestors}`,
].join('; ');

const nextConfig = {
  trailingSlash: false,
  poweredByHeader: false,
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
            value: contentSecurityPolicy,
          },
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
