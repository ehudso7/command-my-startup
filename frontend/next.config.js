/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js to ignore ESLint errors during the build process
  eslint: {
    // This allows the build to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  // Add any other Next.js configuration options here
};

module.exports = nextConfig;
