'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  priceId: string;
  tier: 'free' | 'standard' | 'pro' | 'enterprise';
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic features for solo entrepreneurs',
    price: 0,
    features: [
      'One project',
      'Basic AI commands',
      'Limited chat messages',
      'Standard response time',
    ],
    priceId: '', // No price ID for free tier
    tier: 'free',
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Enhanced features for growing startups',
    price: 49,
    features: [
      'Up to 5 projects',
      'Advanced AI commands',
      'Unlimited chat messages',
      'Faster response time',
      'File uploads up to 50MB',
    ],
    priceId: 'price_YYY', // Replace with your Stripe price ID
    tier: 'standard',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Premium features for scaling businesses',
    price: 99,
    features: [
      'Unlimited projects',
      'All AI commands',
      'Priority response time',
      'File uploads up to 1GB',
      'Team collaboration',
      'Custom integrations',
    ],
    priceId: 'price_ZZZ', // Replace with your Stripe price ID
    tier: 'pro',
  },
];

export default function SubscriptionManager() {
  const { user, profile, refreshSession } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  
  // Current plan based on user's subscription tier
  const currentPlan = PLANS.find(plan => plan.tier === profile?.subscription_tier) || PLANS[0];
  
  // Fetch subscription details
  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);
  
  async function fetchSubscription() {
    try {
      const response = await fetch('/api/subscriptions/current');
      
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  }
  
  // Handle subscription checkout
  async function handleSubscribe(plan: Plan) {
    if (plan.tier === 'free') {
      showToast({
        type: 'info',
        title: 'Free Plan',
        message: 'You are already on the free plan.',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          successUrl: `${window.location.origin}/settings/subscription?success=true`,
          cancelUrl: `${window.location.origin}/settings/subscription?canceled=true`,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      showToast({
        type: 'error',
        title: 'Subscription Error',
        message: error.message || 'Failed to process subscription.',
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Handle cancellation
  async function handleCancelSubscription() {
    if (!subscription) return;
    
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      setLoading(true);
      
      try {
        const response = await fetch('/api/subscriptions/cancel', {
          method: 'POST',
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to cancel subscription');
        }
        
        showToast({
          type: 'success',
          title: 'Subscription Canceled',
          message: 'Your subscription has been canceled and will end at the end of your billing period.',
        });
        
        // Refresh subscription data
        fetchSubscription();
        refreshSession();
      } catch (error: any) {
        console.error('Error canceling subscription:', error);
        showToast({
          type: 'error',
          title: 'Cancellation Error',
          message: error.message || 'Failed to cancel subscription.',
        });
      } finally {
        setLoading(false);
      }
    }
  }
  
  // Format date for display
  function formatDate(timestamp: string) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Current Subscription</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-semibold text-primary">
              {currentPlan.name} Plan
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              {subscription?.status === 'active' && subscription?.cancel_at_period_end
                ? 'Canceled (ends at period end)'
                : subscription?.status || 'Active'}
            </p>
          </div>
          
          {subscription && subscription.status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              disabled={loading || subscription.cancel_at_period_end}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
        
        {subscription && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Current period ends: {formatDate(subscription.current_period_end)}
            </p>
          </div>
        )}
      </div>
      
      <h2 className="text-2xl font-bold mt-8 mb-4">Available Plans</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
              currentPlan.id === plan.id
                ? 'ring-2 ring-primary'
                : ''
            }`}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{plan.description}</p>
              <p className="text-3xl font-bold mt-4">
                ${plan.price}<span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span>
              </p>
              
              <ul className="mt-6 space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading || currentPlan.id === plan.id || (subscription?.cancel_at_period_end && currentPlan.id === plan.id)}
                className={`w-full mt-6 px-4 py-2 rounded-md font-medium ${
                  currentPlan.id === plan.id
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-default'
                    : 'bg-primary hover:bg-primary-dark text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Processing...' : 
                  currentPlan.id === plan.id ? 'Current Plan' : 'Subscribe'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
