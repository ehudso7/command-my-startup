import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// This is a special endpoint that doesn't check for user authentication
// because it's called by Stripe, not by the user
export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2022-11-15",
    });

    const body = await request.text();
    const signature = request.headers.get("stripe-signature") as string;

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 },
      );
    }

    // Verify the event
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 },
      );
    }

    // Handle the event
    const supabase = createClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session, supabase, stripe);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, supabase, stripe);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, supabase);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process webhook" },
      { status: 500 },
    );
  }
}

// Handler for checkout.session.completed
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any,
  stripe: Stripe,
) {
  const userId = session.metadata?.user_id;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error("Missing user_id or subscription_id in session metadata");
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;

  // Get plan details from the database
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("stripe_price_id", priceId)
    .single();

  if (planError) {
    console.error("Failed to find plan:", planError.message);
    return;
  }

  // Save subscription to the database
  const { error: subError } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan_id: plan.id,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    current_period_start: new Date(
      subscription.current_period_start * 1000,
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000,
    ).toISOString(),
  });

  if (subError) {
    console.error("Failed to save subscription:", subError.message);
  }
}

// Handler for invoice.paid
async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: any,
  stripe: Stripe,
) {
  if (!invoice.subscription) return;

  const subscriptionId = invoice.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update subscription in the database
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Failed to update subscription:", error.message);
  }
}

// Handler for invoice.payment_failed
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any,
) {
  if (!invoice.subscription) return;

  const subscriptionId = invoice.subscription as string;

  // Update subscription status in the database
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Failed to update subscription:", error.message);
  }
}

// Handler for customer.subscription.updated
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any,
) {
  // Update subscription in the database
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to update subscription:", error.message);
  }
}

// Handler for customer.subscription.deleted
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any,
) {
  // Update subscription in the database
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to update subscription:", error.message);
  }
}
