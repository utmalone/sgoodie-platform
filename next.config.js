/** @type {import('next').NextConfig} */
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
  }
);

const nextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname
  },
  images: {
    unoptimized: true,
    remotePatterns,
    formats: ['image/avif', 'image/webp']
  }
};

module.exports = nextConfig;
