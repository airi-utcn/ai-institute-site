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
  ...(envPattern ? [envPattern] : []),
];

const isStaticBuild = process.env.STATIC_BUILD === 'true';

const nextConfig = {
  trailingSlash: false,
  // basePath: "/icia-staging",
  ...(isStaticBuild ? { output: 'export' } : {}),
  images: {
    remotePatterns,
    ...(isStaticBuild || isLocalHost ? { unoptimized: true } : {}),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
