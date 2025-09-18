// pages/api/user/save-initials.js - Server-side API to save initials
import { adminSupabase } from '../../../lib/adminSupabase'

export default async function handler(req, res) {
  console.log('🔗 API: save-initials endpoint called')
  console.log('📥 API: Request method:', req.method)
  console.log('📥 API: Request body:', req.body)
  
  if (req.method !== 'POST') {
    console.log('❌ API: Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { initials, userId } = req.body
    console.log('📝 API: Extracted data:', { initials, userId })

    if (!initials || !userId) {
      console.log('❌ API: Missing required fields:', { hasInitials: !!initials, hasUserId: !!userId })
      return res.status(400).json({ error: 'Missing initials or userId' })
    }

    console.log('🔍 API: Checking if user exists in database...')
    
    // First check if user exists
    const { data: existingUser, error: checkError } = await adminSupabase
      .from('user_profiles')
      .select('id, email, initials')
      .eq('id', userId)
      .single()

    if (checkError) {
      console.error('❌ API: Error checking user existence:', checkError)
      return res.status(500).json({ error: 'User not found' })
    }

    console.log('👤 API: Found user:', existingUser)

    // Save initials to Supabase using admin client
    console.log('💾 API: Attempting to update initials...')
    const { data, error } = await adminSupabase
      .from('user_profiles')
      .update({ initials: initials.trim() })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('❌ API: Error saving initials:', error)
      return res.status(500).json({ error: 'Failed to save initials', details: error.message })
    }

    console.log('✅ API: Initials saved successfully:', data)
    console.log('✅ API: Updated user profile:', data[0])
    return res.status(200).json({ success: true, data: data[0] })
  } catch (error) {
    console.error('💥 API: Unexpected error in save-initials:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
