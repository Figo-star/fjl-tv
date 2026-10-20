import type { NextConfig } from "next";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vidlink.pro https://*.videasy.to;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://image.tmdb.org https://images.unsplash.com https://*.vidlink.pro https://*.videasy.to;
  media-src 'self' blob: data: https://lit.cheaptruckrepairs.cc https://test-streams.mux.dev https://*.mux.dev;
  connect-src 'self' https://api.framextv.tech https://api.framextv.xyz https://api.framextv.cc https://lit.cheaptruckrepairs.cc https://test-streams.mux.dev https://*.vidlink.pro https://*.videasy.to;
  font-src 'self' data:;
  frame-src 'self' https://vidlink.pro https://*.vidlink.pro https://player.videasy.to https://*.videasy.to https://vidsrc.to https://*.vidsrc.to https://vidsrc.me https://*.vidsrc.me;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
