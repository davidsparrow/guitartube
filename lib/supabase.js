// lib/supabase.js - Enhanced Supabase Client
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// =============================================================
// USER PROFILE FUNCTIONS
// =============================================================

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()

  return { data, error }
}

// =============================================================
// FEATURE ACCESS FUNCTIONS
// =============================================================

export const checkFeatureAccess = async (userId, featureKey) => {
  try {
    const { data, error } = await supabase
      .rpc('has_feature_access', {
        user_id_param: userId,
        feature_key_param: featureKey
      })
    
    if (error) {
      console.error('Feature access check error:', error)
      return false
    }
    
    return data
  } catch (error) {
    console.error('Feature access check failed:', error)
    return false
  }
}

export const getAllFeatureGates = async () => {
  const { data, error } = await supabase
    .from('feature_gates')
    .select('*')
    .eq('is_enabled', true)
    .order('feature_name')
  
  return { data, error }
}

// =============================================================
// USAGE TRACKING FUNCTIONS
// =============================================================

export const incrementSearchUsage = async (userId) => {
  try {
    const { data, error } = await supabase
      .rpc('increment_search_usage', {
        user_id_param: userId
      })

    if (error) {
      console.error('Search usage increment error:', error)
      return false
    }

    return data // Returns true if under limit, false if over limit
  } catch (error) {
    console.error('Search usage increment failed:', error)
    return false
  }
}

// Test function to verify search limits are working correctly
export const testSearchLimits = async () => {
  try {
    const { data, error } = await supabase
      .rpc('test_search_limits')

    if (error) {
      console.error('Test search limits error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Test search limits failed:', error)
    return null
  }
}

// Get feature gates for testing
export const getFeatureGates = async () => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('setting_key', 'feature_gates')
      .single()

    if (error) {
      console.error('Get feature gates error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get feature gates failed:', error)
    return null
  }
}

export const getUserUsageStats = async (userId, days = 30) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false })
  
  return { data, error }
}

// =============================================================
// SEARCH HISTORY FUNCTIONS
// =============================================================

export const saveSearch = async (userId, searchQuery, resultsCount = 0, metadata = {}) => {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: userId,
      search_query: searchQuery,
      results_count: resultsCount,
      search_metadata: metadata
    })
    .select()
    .single()
  
  return { data, error }
}

export const getUserSearchHistory = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return { data, error }
}

export const toggleSearchFavorite = async (searchId, isFavorite) => {
  const { data, error } = await supabase
    .from('saved_searches')
    .update({ is_favorite: isFavorite })
    .eq('id', searchId)
    .select()
    .single()
  
  return { data, error }
}

// =============================================================
// CUSTOM LOOPS FUNCTIONS (Premium Feature)
// =============================================================

export const createCustomLoop = async (loopData) => {
  console.log('🔍 createCustomLoop called with:', loopData)

  const { data, error } = await supabase
    .from('custom_loops')
    .insert(loopData)
    .select()
    .single()

  console.log('🔍 createCustomLoop result:', { data, error })
  return { data, error }
}

export const getUserLoops = async (userId, videoId = null) => {
  console.log('🔍 getUserLoops called with:', { userId, videoId })

  let query = supabase
    .from('custom_loops')
    .select('*')
    .eq('user_id', userId)

  // If videoId provided, filter by specific video
  if (videoId) {
    query = query.eq('video_id', videoId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  console.log('🔍 getUserLoops result:', { data, error, count: data?.length })
  return { data, error }
}

export const updateCustomLoop = async (loopId, updates) => {
  const { data, error } = await supabase
    .from('custom_loops')
    .update(updates)
    .eq('id', loopId)
    .select()
    .single()
  
  return { data, error }
}

export const deleteCustomLoop = async (loopId) => {
  const { error } = await supabase
    .from('custom_loops')
    .delete()
    .eq('id', loopId)
  
  return { error }
}

// =============================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================

export const subscribeToProfile = (userId, callback) => {
  return supabase
    .channel(`profile-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export const subscribeToUserLoops = (userId, callback) => {
  return supabase
    .channel(`loops-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'custom_loops',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

// =============================================================
// UTILITY FUNCTIONS
// =============================================================

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const isUserPremium = async (userId) => {
  const { data } = await getUserProfile(userId)
  return data?.subscription_tier === 'premium'
}

// Test database connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('feature_gates')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database connection test failed:', error)
      return false
    }
    
    console.log('Database connection successful')
    return true
  } catch (error) {
    console.error('Database connection test error:', error)
    return false
  }
}