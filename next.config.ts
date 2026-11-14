import type { NextConfig } from "next";

// Courses and classes were removed (docs/courses-restore.md in the backend).
// Old links land on a working page instead of a 404.
const removedRoutes = [
  ...["/courses", "/my-courses", "/learn", "/classes", "/teacher"].flatMap((base) => [
    { source: base, destination: "/dashboard", permanent: false },
    { source: `${base}/:path*`, destination: "/dashboard", permanent: false },
  ]),
  ...["/admin/courses", "/admin/assignments", "/admin/enroll"].flatMap((base) => [
    { source: base, destination: "/admin", permanent: false },
    { source: `${base}/:path*`, destination: "/admin", permanent: false },
  ]),
];

const nextConfig: NextConfig = {
  // A second dev server (the disposable QA harness) needs its own build
  // directory so it never shares .next with the owner's running instance.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    // Media URLs are resolved by the backend to this public R2 origin; the
    // frontend never constructs object keys.
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
  // Production: the browser calls /api on this domain and Next.js forwards it
  // to the API (API_ORIGIN), so the refresh cookie is first-party and works
  // in Safari too (owner 2026-11-14). Set NEXT_PUBLIC_API_URL=/api with it.
  async rewrites() {
    const api = process.env.API_ORIGIN?.replace(/\/$/, '');
    return api ? [{ source: '/api/:path*', destination: `${api}/:path*` }] : [];
  },
  async redirects() {
    return [
      {
        source: '/course',
        destination: '/dashboard',
        permanent: false,
      },
      ...removedRoutes,
    ];
  },
};

export default nextConfig;
