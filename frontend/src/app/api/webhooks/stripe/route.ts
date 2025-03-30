import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-03-30',
});

// Map Stripe price IDs to subscription tiers
const PRICE_ID_TO_TIER: Record<string, string> = {
  // Replace these with your actual Stripe price IDs
  'price_XXX': 'free',
  'price_YYY': 'standard',
  'price_ZZZ': 'pro',
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature') as string;
  
  // Verify webhook signature
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${error.message}` },
      { status: 400 }
    );
  }
  
  const supabase = createClient();
  
  // Handle various subscription events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.metadata?.user_id) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0].price.id;
          const tier = PRICE_ID_TO_TIER[priceId] || 'free';
          
          // Update user's subscription in database
          await supabase
            .from('subscriptions')
            .upsert({
              user_id: session.metadata.user_id,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              tier,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, { onConflict: 'user_id' });
            
          // Update user's tier in users table
          await supabase
            .from('users')
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status,
            })
            .eq('id', session.metadata.user_id);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Get user by customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
          
        if (user) {
          const priceId = subscription.items.data[0].price.id;
          const tier = PRICE_ID_TO_TIER[priceId] || 'free';
          
          // Update subscription in database
          await supabase
            .from('subscriptions')
            .update({
              tier,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', subscription.id);
            
          // Update user's tier in users table
          await supabase
            .from('users')
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status,
            })
            .eq('id', user.id);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update subscription in database
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
          })
          .eq('stripe_subscription_id', subscription.id);
          
        // Get user by subscription ID
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();
          
        if (subscriptionData) {
          // Downgrade user to free tier
          await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              subscription_status: 'canceled',
            })
            .eq('id', subscriptionData.user_id);
        }
        break;
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to handle webhook event' },
      { status: 500 }
    );
  }
}
