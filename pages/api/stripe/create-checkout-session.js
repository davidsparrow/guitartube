// pages/api/stripe/create-checkout-session.js
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for database updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Product IDs from your environment variables
const PRODUCT_IDS = {
  roadie: process.env.STRIPE_ROADIE_PRODUCT_ID,
  hero: process.env.STRIPE_HERO_PRODUCT_ID
};

// Price IDs from your environment variables
const PRICE_IDS = {
  roadie_monthly: process.env.STRIPE_ROADIE_MONTHLY_PRICE_ID,
  roadie_annual: process.env.STRIPE_ROADIE_ANNUAL_PRICE_ID,
  hero_monthly: process.env.STRIPE_HERO_MONTHLY_PRICE_ID,
  hero_annual: process.env.STRIPE_HERO_ANNUAL_PRICE_ID
};

export default async function handler(req, res) {
  console.log('🔍 CHECKOUT SESSION API: Request received')
  console.log('🔍 CHECKOUT SESSION API: Method:', req.method)
  console.log('🔍 CHECKOUT SESSION API: Body:', req.body)

  if (req.method !== 'POST') {
    console.log('❌ CHECKOUT SESSION API: Invalid method')
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { plan, billingCycle, userEmail, userId } = req.body;

    console.log('🔍 CHECKOUT SESSION API: Extracted data:', {
      plan,
      billingCycle,
      userEmail,
      userId
    })

    // Validate required fields
    if (!plan || !userEmail) {
      console.log('❌ CHECKOUT SESSION API: Missing required fields')
      return res.status(400).json({
        message: 'Missing required fields: plan, userEmail'
      });
    }

    // Validate plan
    if (!['freebird', 'roadie', 'hero'].includes(plan)) {
      console.log('❌ CHECKOUT SESSION API: Invalid plan:', plan)
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    // Handle freebird plan (no Stripe needed)
    if (plan === 'freebird') {
      console.log('🔍 CHECKOUT SESSION API: Processing freebird plan')
      console.log('🔍 CHECKOUT SESSION API: userId exists?', !!userId)

      // Update user profile to freebird plan using centralized utility
      if (userId) {
        console.log('🔍 CHECKOUT SESSION API: Starting database update for userId:', userId)

        const updateData = {
          subscription_tier: 'freebird',
          subscription_status: 'active',
          plan_selected_at: new Date().toISOString()
        };

        console.log('🔍 CHECKOUT SESSION API: Update data:', updateData)

        // Use admin client with service role key to bypass RLS
        const { data, error } = await adminSupabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', userId)
          .select();

        console.log('🔍 CHECKOUT SESSION API: Raw database response:', { data, error })

        if (error) {
          console.error('❌ CHECKOUT SESSION API: Database update error:', error);
          console.error('❌ CHECKOUT SESSION API: Error details:', JSON.stringify(error, null, 2));
          return res.status(500).json({
            message: 'Failed to update user profile',
            error: error.message
          });
        }

        console.log('✅ CHECKOUT SESSION API: Database update successful')
        console.log('✅ CHECKOUT SESSION API: Updated data:', JSON.stringify(data, null, 2))

        // Verify the update actually worked by reading it back
        console.log('🔍 CHECKOUT SESSION API: Verifying update by reading back...')
        const { data: verifyData, error: verifyError } = await adminSupabase
          .from('user_profiles')
          .select('subscription_tier, subscription_status, plan_selected_at')
          .eq('id', userId)
          .single();

        console.log('🔍 CHECKOUT SESSION API: Verification result:', { verifyData, verifyError })

      } else {
        console.log('❌ CHECKOUT SESSION API: No userId provided, skipping database update')
      }

      console.log('✅ CHECKOUT SESSION API: Returning success response')
      return res.status(200).json({
        message: 'Successfully updated to freebird plan',
        plan: 'freebird'
      });
    }

    // For paid plans, validate billing cycle
    if (!billingCycle || !['monthly', 'annual'].includes(billingCycle)) {
      return res.status(400).json({ message: 'Invalid billing cycle' });
    }

    // Check if user already has a paid subscription
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_status, stripe_customer_id')
      .eq('email', userEmail)
      .single();

    if (existingProfile) {
      // If user already has a paid plan, prevent duplicate signup
      if (existingProfile.subscription_tier !== 'freebird' && 
          existingProfile.subscription_status === 'active') {
        return res.status(400).json({
          message: 'You already have an active subscription',
          currentPlan: existingProfile.subscription_tier,
          status: existingProfile.subscription_status
        });
      }
    }

    // Get the appropriate price ID based on plan and billing cycle
    const priceId = PRICE_IDS[`${plan}_${billingCycle}`];
    if (!priceId) {
      return res.status(400).json({ message: 'Invalid price configuration' });
    }

    // Create or retrieve Stripe customer
    let customerId = existingProfile?.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_id: userId || 'unknown'
        }
      });
      customerId = customer.id;

      // Update user profile with Stripe customer ID
      if (userId) {
        await supabase
          .from('user_profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      }
    }

    // Create checkout session with 30-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/search?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      subscription_data: {
        trial_period_days: 30, // 30-day trial
        metadata: {
          plan: plan,
          billing_cycle: billingCycle,
          user_id: userId || 'unknown'
        }
      },
      metadata: {
        plan: plan,
        billing_cycle: billingCycle,
        user_id: userId || 'unknown'
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    // Update user profile to mark plan selection
    if (userId) {
      await supabase
        .from('user_profiles')
        .update({ 
          subscription_tier: plan,
          subscription_status: 'trialing',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .eq('id', userId);
    }

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      message: 'Failed to create checkout session',
      error: error.message 
    });
  }
}