/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  
  // Environment variables
  env: {
    VERCEL: process.env.VERCEL || '1',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build_time_only",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_dummy_key_for_build_time_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_dummy_key_for_build_time_only",
  },
  
  // Output settings
  output: 'standalone',
  
  // Server component settings
  serverExternalPackages: ['@supabase/ssr'],
  
  // Experimental options with proper configuration
  experimental: {
    // Only specify critical features
    optimizePackageImports: ['react-dom'],
    serverActions: {
      allowedOrigins: ['localhost:3000', 'command-my-startup-frontend-vercel.app', 'vercel.app']
    }
  },
};

module.exports = nextConfig;