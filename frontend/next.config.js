/** @type {import('next').NextConfig} */
export default {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    STRIPE_SECRET_KEY:
      process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build_time_only",
    STRIPE_WEBHOOK_SECRET:
      process.env.STRIPE_WEBHOOK_SECRET ||
      "whsec_dummy_key_for_build_time_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      "pk_test_dummy_key_for_build_time_only",
  },
};
