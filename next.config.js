/** @type {import('next').NextConfig} */

const securityHeadersBase = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // SAMEORIGIN (not DENY) so the admin Preview Site iframe can embed our own pages.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

const isProdBuild = process.env.NODE_ENV === 'production';

const imageHost = process.env.NEXT_PUBLIC_IMAGE_HOSTNAME;
const remotePatterns = [];

if (imageHost) {
  try {
    const normalized = imageHost.startsWith('http')
      ? imageHost
      : `https://${imageHost}`;
    const url = new URL(normalized);
    remotePatterns.push({
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: '/**'
    });
  } catch {
    remotePatterns.push({
      protocol: 'https',
      hostname: imageHost,
      pathname: '/**'
    });
  }
}

remotePatterns.push(
  {
    protocol: 'https',
    hostname: 'sgoodie-photos-prod.s3.amazonaws.com',
    pathname: '/**'
  },
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    pathname: '/**'
  },
  // Instagram CDN — media_url hostnames vary by region
  {
    protocol: 'https',
    hostname: '*.cdninstagram.com',
    pathname: '/**'
  }
);

const nextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname
  },
  images: {
    // Disable Next optimizer: photos are sized with `sizes`; originals served via CloudFront/S3 work well with SSR on Amplify.
    unoptimized: true,
    remotePatterns,
    formats: ['image/avif', 'image/webp']
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...(isProdBuild
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload'
                }
              ]
            : []),
          ...securityHeadersBase
        ]
      }
    ];
  }
};

module.exports = nextConfig;
