import Stripe from 'stripe';

// Function to get Stripe instance
export function getStripeInstance(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  
  // If we're in a build/CI environment with no API key
  if (!apiKey) {
    // For build time only, return a mock or instance with a dummy key
    console.warn('Using dummy Stripe key for build process');
    return new Stripe('sk_test_dummy_key_for_build_time_only', {
      apiVersion: '2022-11-15',
    });
  }
  
  // For regular runtime with proper API key
  return new Stripe(apiKey, {
    apiVersion: '2022-11-15',
  });
}

// Export a singleton instance
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = getStripeInstance();
  }
  return stripeInstance;
}
