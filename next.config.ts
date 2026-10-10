import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
