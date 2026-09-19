import type { NextConfig } from "next";

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
  turbopack: {},

  async headers() {
    return [
      {
        // The service worker itself must never be cached, or a browser can
        // keep re-installing the same stale worker and the kill-switch in
        // public/sw.js never reaches it.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

/*
 * next-pwa has been removed.
 *
 * It is unmaintained, expects webpack (which is why this project couldn't use
 * Turbopack), and its stock Workbox config precached a build manifest and
 * applied NetworkFirst to `/api/*`. Between them those produced the stale-data
 * and "site can't be reached until I clear my browser" reports. The service
 * worker is now hand-written in public/sw.js and registered by
 * components/pwa/service-worker-manager.tsx.
 */
export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
