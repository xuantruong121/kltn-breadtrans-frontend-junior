import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second dev server (the disposable QA harness) needs its own build
  // directory so it never shares .next with the owner's running instance.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    // Course thumbnails and lesson media are resolved by the backend to this
    // public R2 origin; the frontend never constructs object keys.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-ecd236c9754a4b7cb22ab82189e6ded2.r2.dev',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async redirects() {
    return [
      {
        source: '/course',
        destination: '/courses',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
