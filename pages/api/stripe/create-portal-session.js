// pages/api/stripe/create-portal-session.js - Create Stripe Customer Portal Session
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
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed. This endpoint only accepts POST requests.',
      error: 'METHOD_NOT_ALLOWED',
      supportInfo: 'Please contact support if you continue to see this error. Include this error code: METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { userId, userEmail, returnUrl } = req.body;

    // Validate required fields
    if (!userId || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required information. Both user ID and email address are required to access subscription management.',
        error: 'MISSING_REQUIRED_FIELDS',
        supportInfo: `Please contact support with this error. Missing fields: ${!userId ? 'userId ' : ''}${!userEmail ? 'userEmail' : ''}. Error code: MISSING_REQUIRED_FIELDS`
      });
    }

    console.log('🔍 PORTAL SESSION API: Request received for user:', userEmail, 'userId:', userId);

    // Get user profile to validate subscription and find Stripe customer ID
    const { data: profile, error: profileError } = await adminSupabase
      .from('user_profiles')
      .select('stripe_customer_id, subscription_tier, subscription_status, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ PORTAL SESSION API: Profile lookup failed:', profileError);
      return res.status(404).json({
        success: false,
        message: 'Unable to find your user profile in our system. This may be a temporary issue or your account may need to be verified.',
        error: 'USER_PROFILE_NOT_FOUND',
        supportInfo: `Please contact support with this information: User ID: ${userId}, Email: ${userEmail}, Error: ${profileError?.message || 'Profile not found'}, Error code: USER_PROFILE_NOT_FOUND`
      });
    }

    // Validate user has a paid subscription (roadie or hero only)
    if (!profile.subscription_tier || profile.subscription_tier === 'freebird') {
      console.log('❌ PORTAL SESSION API: User attempted to access portal with free plan:', profile.subscription_tier);
      return res.status(403).json({
        success: false,
        message: 'Subscription management is only available for paid subscribers (Roadie and Hero plans). Free Freebird users do not have subscription management options.',
        error: 'FREE_PLAN_NOT_SUPPORTED',
        supportInfo: `Please contact support if you believe this is an error. User details: Email: ${userEmail}, Current plan: ${profile.subscription_tier || 'none'}, Error code: FREE_PLAN_NOT_SUPPORTED`
      });
    }

    // Check if user has Stripe customer ID
    if (!profile.stripe_customer_id) {
      console.error('❌ PORTAL SESSION API: No Stripe customer ID found for paid user');
      return res.status(400).json({
        success: false,
        message: 'Your subscription was not properly linked to our payment system. This is a technical issue that requires support assistance.',
        error: 'MISSING_STRIPE_CUSTOMER_ID',
        supportInfo: `Please contact support immediately with this information: Email: ${userEmail}, Plan: ${profile.subscription_tier}, Status: ${profile.subscription_status}, Error: Missing Stripe customer ID, Error code: MISSING_STRIPE_CUSTOMER_ID`
      });
    }

    console.log('🔍 PORTAL SESSION API: Found customer:', profile.stripe_customer_id, 'Plan:', profile.subscription_tier);

    // DEBUG: Add detailed logging before Stripe call
    console.log('🔍 PORTAL DEBUG: About to call Stripe with customer ID')
    console.log('🔍 PORTAL DEBUG: Raw customer ID from DB:', profile.stripe_customer_id)
    console.log('🔍 PORTAL DEBUG: Customer ID length:', profile.stripe_customer_id.length)
    console.log('🔍 PORTAL DEBUG: Customer ID as JSON:', JSON.stringify(profile.stripe_customer_id))
    console.log('🔍 PORTAL DEBUG: Character by character:', profile.stripe_customer_id.split('').map((char, i) => `${i}: "${char}" (${char.charCodeAt(0)})`))

    // Verify the Stripe customer exists
    let stripeCustomer;
    try {
      stripeCustomer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (stripeCustomer.deleted) {
        throw new Error('Customer has been deleted in Stripe');
      }
    } catch (stripeError) {
      // DEBUG: Add detailed error logging
      console.log('🔍 PORTAL DEBUG: Stripe error occurred')
      console.log('🔍 PORTAL DEBUG: Original customer ID we sent:', profile.stripe_customer_id)
      console.log('🔍 PORTAL DEBUG: Stripe error message:', stripeError.message)
      console.log('🔍 PORTAL DEBUG: Stripe error object:', JSON.stringify(stripeError, null, 2))

      console.error('❌ PORTAL SESSION API: Stripe customer verification failed:', stripeError);
      return res.status(400).json({
        success: false,
        message: 'There was an issue accessing your payment information. This may be due to a synchronization problem between our systems.',
        error: 'STRIPE_CUSTOMER_VERIFICATION_FAILED',
        supportInfo: `Please contact support with this information: Email: ${userEmail}, Stripe Customer ID: ${profile.stripe_customer_id}, Stripe Error: ${stripeError.message}, Error code: STRIPE_CUSTOMER_VERIFICATION_FAILED`
      });
    }

    // Set default return URL if not provided
    const portalReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/`;

    console.log('🔍 PORTAL SESSION API: Creating portal session with return URL:', portalReturnUrl);

    // Create Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: portalReturnUrl,
    });

    console.log('✅ PORTAL SESSION API: Portal session created successfully:', session.id);

    return res.status(200).json({
      success: true,
      message: 'Subscription management portal session created successfully',
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('❌ PORTAL SESSION API: Unexpected error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        message: 'There was an issue with your payment method. Please try again or contact support.',
        error: 'STRIPE_CARD_ERROR',
        supportInfo: `Stripe card error occurred. Please contact support with this information: Error: ${error.message}, Code: ${error.code}, Error code: STRIPE_CARD_ERROR`
      });
    }
    
    if (error.type === 'StripeRateLimitError') {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a moment and try again.',
        error: 'STRIPE_RATE_LIMIT',
        supportInfo: `Rate limit exceeded. Please contact support if this persists. Error code: STRIPE_RATE_LIMIT`
      });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        message: 'There was a technical issue with your subscription management request. Please contact support.',
        error: 'STRIPE_INVALID_REQUEST',
        supportInfo: `Stripe invalid request error. Please contact support with this information: Error: ${error.message}, Param: ${error.param || 'none'}, Error code: STRIPE_INVALID_REQUEST`
      });
    }
    
    if (error.type === 'StripeAPIError') {
      return res.status(500).json({
        success: false,
        message: 'Our payment system is temporarily unavailable. Please try again in a few minutes.',
        error: 'STRIPE_API_ERROR',
        supportInfo: `Stripe API error occurred. Please contact support with this information: Error: ${error.message}, Error code: STRIPE_API_ERROR`
      });
    }
    
    if (error.type === 'StripeConnectionError') {
      return res.status(500).json({
        success: false,
        message: 'Unable to connect to our payment system. Please check your internet connection and try again.',
        error: 'STRIPE_CONNECTION_ERROR',
        supportInfo: `Connection error to Stripe. Please contact support if this persists. Error: ${error.message}, Error code: STRIPE_CONNECTION_ERROR`
      });
    }
    
    // Generic error fallback
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while setting up subscription management. Please try again or contact support.',
      error: 'UNEXPECTED_ERROR',
      supportInfo: `Unexpected error in portal session creation. Please contact support with this information: Error: ${error.message}, Stack: ${error.stack?.substring(0, 200)}..., Error code: UNEXPECTED_ERROR`
    });
  }
}
