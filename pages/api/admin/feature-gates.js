// pages/api/admin/feature-gates.js - Admin API for feature gates
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase server environment variables')
}

// Admin client with service role (bypasses RLS)
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { featureGates, userRole } = req.body

    // Verify user is admin (basic check)
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    console.log('🔧 API: Saving feature gates via service role...')
    console.log('🔧 API: Payload:', featureGates)

    // Update feature gates using service role (bypasses RLS)
    const { data, error } = await adminSupabase
      .from('admin_settings')
      .update({
        setting_value: featureGates,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'feature_gates')
      .select()

    if (error) {
      console.error('❌ API: Feature gates save error:', error)
      return res.status(500).json({ 
        error: 'Failed to save feature gates',
        details: error.message 
      })
    }

    console.log('✅ API: Feature gates saved successfully:', data)

    return res.status(200).json({ 
      success: true, 
      data: data[0] || null,
      message: 'Feature gates saved successfully'
    })

  } catch (error) {
    console.error('❌ API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}
