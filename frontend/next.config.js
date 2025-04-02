/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  
  // Improved webpack configuration for better hot reloading
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Use native file system events instead of polling for better performance
      // Only use polling when explicitly requested via NEXT_WEBPACK_POLLING env var
      if (process.env.NEXT_WEBPACK_POLLING) {
        console.log('🔄 Using webpack polling mode...');
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 200,
          ignored: /node_modules/,
        };
      } else {
        // Default to native file system events for faster refresh
        config.watchOptions = {
          ignored: /node_modules/,
        };
      }
    }
    return config;
  },
  
  // Increased buffer length for better development experience
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 1 minute
    pagesBufferLength: 8,
  },
  
  env: {
    VERCEL: process.env.VERCEL || '0',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build_time_only",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_dummy_key_for_build_time_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_dummy_key_for_build_time_only",
  },
  
  transpilePackages: [],
  output: 'standalone',
  
  // Specify server external packages for server components
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  
  // Other configuration options
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'react-dom'],
    serverActions: true
  },
};

module.exports = nextConfig;