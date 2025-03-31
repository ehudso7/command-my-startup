// src/lib/stripe.ts
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    console.warn("Missing STRIPE_SECRET_KEY environment variable");
    // For build time only, provide a dummy key
    stripeInstance = new Stripe("sk_test_dummy_key_for_build_time_only", {
      apiVersion: "2025-02-24.acacia",
    });
  } else {
    stripeInstance = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripeInstance;
}
