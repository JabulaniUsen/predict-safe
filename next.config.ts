import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  images: {
    // The Cloudflare hosting plan this site runs on doesn't have Cloudflare
    // Images enabled, so Next's built-in /_next/image optimizer 402s on every
    // request ("OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED") - breaking every
    // <Image> on the site (logo, team badges, blog images, etc). Serve images
    // unoptimized/direct instead, which works fine on this host.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'apiv3.apifootball.com',
        pathname: '/badges/**',
      },
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
        pathname: '/football/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Add empty turbopack config to silence the warning
  // next-pwa requires webpack, so we're explicitly using webpack
  turbopack: {},
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/app-manifest\.json$/],
});

export default pwaConfig(nextConfig as any);
