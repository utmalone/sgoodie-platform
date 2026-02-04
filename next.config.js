/** @type {import('next').NextConfig} */
const imageHost = process.env.NEXT_PUBLIC_IMAGE_HOSTNAME;
const domains = [];

if (imageHost) {
  domains.push(imageHost);
}

domains.push('sgoodie-photos-prod.s3.amazonaws.com');
domains.push('images.unsplash.com');

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    domains,
    formats: ['image/avif', 'image/webp']
  }
};

module.exports = nextConfig;
