/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Configure webpack for better hot reloading and ensuring CSS processing works
  webpack: (config, { dev, isServer }) => {
    // Enable hot reloading
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        ignored: /node_modules/,
      };
    }

    // Use mock backend in production builds
    if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }

    return config;
  },
  
  // Disable hot reloading migration tool logs
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 4,
  },
  
  // Ensure proper environment variables are available at build time
  env: {
    VERCEL: process.env.VERCEL || '0',
    STRIPE_SECRET_KEY:
      process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build_time_only",
    STRIPE_WEBHOOK_SECRET:
      process.env.STRIPE_WEBHOOK_SECRET ||
      "whsec_dummy_key_for_build_time_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      "pk_test_dummy_key_for_build_time_only",
  },
  
  // Add transpilePackages if needed for any problematic dependencies
  transpilePackages: [],
  
  // Ensure full static output
  output: 'standalone',
};

module.exports = nextConfig;
