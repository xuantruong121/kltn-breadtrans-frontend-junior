import type { NextConfig } from "next";

// Courses are hidden unless explicitly enabled (see src/lib/featureFlags.ts).
const COURSES_ENABLED = process.env.NEXT_PUBLIC_COURSES_ENABLED === "true";
const hiddenCourseRoutes = COURSES_ENABLED
  ? []
  : [
      ...["/courses", "/my-courses", "/learn", "/classes"].flatMap((base) => [
        { source: base, destination: "/dashboard", permanent: false },
        { source: `${base}/:path*`, destination: "/dashboard", permanent: false },
      ]),
      { source: "/admin/courses", destination: "/admin", permanent: false },
      { source: "/admin/courses/:path*", destination: "/admin", permanent: false },
      { source: "/admin/assignments", destination: "/admin", permanent: false },
    ];

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
        destination: COURSES_ENABLED ? '/courses' : '/dashboard',
        permanent: false,
      },
      ...hiddenCourseRoutes,
    ];
  },
};

export default nextConfig;
