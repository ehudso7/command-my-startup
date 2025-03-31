/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // This allows the build to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This allows the build to complete even if there are TypeScript errors
    ignoreBuildErrors: true,
  },
  // Add any other Next.js configuration options you need
};

module.exports = nextConfig;
