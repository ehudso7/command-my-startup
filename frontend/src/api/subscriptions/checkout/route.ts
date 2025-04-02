import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// Mark this route as dynamic to handle cookies/auth
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 },
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
    });

    // Get user's customer ID or create a new one
    let customerId;

    // Check if user already has a Stripe customer ID
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError && customerError.code !== "PGRST116") {
      return NextResponse.json(
        { error: customerError.message },
        { status: 500 },
      );
    }

    if (customer?.stripe_customer_id) {
      customerId = customer.stripe_customer_id;
    } else {
      // Create a new Stripe customer
      const { email } = user;
      const newCustomer = await stripe.customers.create({
        email,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = newCustomer.id;

      // Save the customer ID to the database
      const { error: saveError } = await supabase.from("customers").insert({
        user_id: user.id,
        stripe_customer_id: customerId,
      });

      if (saveError) {
        return NextResponse.json({ error: saveError.message }, { status: 500 });
      }
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
