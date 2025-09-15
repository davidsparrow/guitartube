// pages/api/stripe/cancel-subscription.js - Cancel user subscription
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for database updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, userEmail } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({ message: 'User ID and email are required' });
    }

    console.log('🔍 CANCEL SUBSCRIPTION API: Request received for user:', userEmail);

    // Get user profile to find Stripe customer ID
    const { data: profile, error: profileError } = await adminSupabase
      .from('user_profiles')
      .select('stripe_customer_id, subscription_tier, subscription_status')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ CANCEL SUBSCRIPTION API: Profile lookup failed:', profileError);
      return res.status(404).json({ message: 'User profile not found' });
    }

    if (!profile.stripe_customer_id) {
      console.error('❌ CANCEL SUBSCRIPTION API: No Stripe customer ID found');
      return res.status(400).json({ message: 'No Stripe customer found for this user' });
    }

    if (profile.subscription_tier === 'freebird') {
      return res.status(400).json({ message: 'User is already on free plan' });
    }

    console.log('🔍 CANCEL SUBSCRIPTION API: Found customer:', profile.stripe_customer_id);

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 10
    });

    // Also check for trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'trialing',
      limit: 10
    });

    const allSubscriptions = [...subscriptions.data, ...trialingSubscriptions.data];

    if (allSubscriptions.length === 0) {
      console.log('🔍 CANCEL SUBSCRIPTION API: No active subscriptions found');
      return res.status(400).json({ message: 'No active subscription found to cancel' });
    }

    // Cancel the first active subscription (there should only be one)
    const subscription = allSubscriptions[0];
    console.log('🔍 CANCEL SUBSCRIPTION API: Canceling subscription:', subscription.id);

    // Cancel at period end (recommended - user keeps access until period ends)
    const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });

    // Handle potential null/invalid current_period_end
    const periodEndTimestamp = canceledSubscription.current_period_end;
    const periodEndDate = periodEndTimestamp ? new Date(periodEndTimestamp * 1000) : null;

    console.log('✅ CANCEL SUBSCRIPTION API: Subscription marked for cancellation:', {
      subscriptionId: canceledSubscription.id,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      currentPeriodEndTimestamp: periodEndTimestamp,
      currentPeriodEnd: periodEndDate
    });

    // Update user profile to reflect cancellation status (only if we have a valid date)
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (periodEndDate && !isNaN(periodEndDate.getTime())) {
      updateData.subscription_ends_at = periodEndDate.toISOString();
    }

    const { error: updateError } = await adminSupabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('❌ CANCEL SUBSCRIPTION API: Profile update failed:', updateError);
      // Don't fail the request - Stripe cancellation succeeded
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription canceled successfully',
      subscription: {
        id: canceledSubscription.id,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: canceledSubscription.current_period_end,
        access_until: new Date(canceledSubscription.current_period_end * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ CANCEL SUBSCRIPTION API: Error:', error);
    return res.status(500).json({ 
      message: 'Failed to cancel subscription',
      error: error.message 
    });
  }
}
