/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 200,
        ignored: /node_modules/,
      };
    }
    return config;
  },
  
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 4,
  },
  
  env: {
    VERCEL: process.env.VERCEL || '0',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build_time_only",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_dummy_key_for_build_time_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_dummy_key_for_build_time_only",
  },
  
  transpilePackages: [],
  output: 'standalone',
  
  // Fix swcMinify issues
  swcMinify: false,
  
  // Disable static optimization for all pages to avoid Server Component serialization issues
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  },
};

module.exports = nextConfig;
