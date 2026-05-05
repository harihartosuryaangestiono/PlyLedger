import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors. Vercel sometimes has issues generating Prisma types.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
