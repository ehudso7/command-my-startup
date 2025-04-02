/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build optimizations
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Performance settings
  reactStrictMode: false,
  poweredByHeader: false,
  
  // Static optimization - increase cache effectiveness
  staticPageGenerationTimeout: 120,
  
  // Environment variables
  env: {
    VERCEL: process.env.VERCEL || '1',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build_time_only",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_dummy_key_for_build_time_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_dummy_key_for_build_time_only",
  },
  
  // Production output
  output: 'standalone',
  
  // External packages for server components
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  
  // Optimized experimental features
  experimental: {
    // Disabled CSS optimization to avoid critters dependency issues
    optimizeCss: false,
    // Performance optimizations
    scrollRestoration: true,
  },

  // Image optimization settings
  images: {
    unoptimized: false,
    remotePatterns: [],
  },
};

module.exports = nextConfig;