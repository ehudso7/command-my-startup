// Simplified Next.js configuration for Vercel deployment
/** @type {import('next').NextConfig} */
module.exports = {
  // Basic build options
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable all experimental features
  experimental: {},
  
  // Use standard output
  output: 'standalone',
  
  // Simplify image loader
  images: {
    domains: [],
    remotePatterns: [],
    unoptimized: true,
  },
};