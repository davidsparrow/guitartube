// pages/api/user/save-initials.js - Server-side API to save initials
import { adminSupabase } from '../../../lib/adminSupabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { initials, userId } = req.body

    if (!initials || !userId) {
      return res.status(400).json({ error: 'Missing initials or userId' })
    }

    // Save initials to Supabase using admin client
    const { error } = await adminSupabase
      .from('user_profiles')
      .update({ initials: initials.trim() })
      .eq('id', userId)

    if (error) {
      console.error('Error saving initials:', error)
      return res.status(500).json({ error: 'Failed to save initials' })
    }

    console.log('✅ Initials saved to Supabase:', initials.trim(), 'for user:', userId)
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in save-initials API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
