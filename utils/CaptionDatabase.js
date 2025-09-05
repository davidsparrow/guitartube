import { supabase } from '../lib/supabase'
import { assignSerialNumbersToCaptions } from './captionUtils'

/**
 * Caption Database Operations
 * Contains all caption-related database functions extracted from pages/watch.js
 * These functions handle CRUD operations for captions and user preferences
 */

/**
 * Save user's default caption duration to database
 * @param {number} duration - Duration in seconds
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const saveUserDefaultCaptionDuration = async (duration, userId) => {
  if (!userId) return
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ default_caption_duration_seconds: duration })
      .eq('id', userId)
    
    if (error) {
      console.error('Error saving default caption duration:', error)
      return
    }
    
  } catch (error) {
    console.error('Error saving default caption duration:', error)
  }
}

/**
 * Check if a video is favorited by the user
 * @param {string} videoId - YouTube video ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export const checkIfVideoFavorited = async (videoId, userId) => {
  try {
    if (!userId || !videoId) return false

    console.log('🔍 CHECKING FAVORITE STATUS for:', { videoId, userId })

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      // Removed .single() to avoid 406 errors when no rows exist

    if (error) {
      console.error('❌ Error checking favorite status:', error)
      console.error('❌ Error details:', error.message, error.code)
      return false
    }

    const isFavorited = data && data.length > 0
    console.log('🔍 FAVORITE STATUS RESULT:', { isFavorited, rowCount: data?.length })

    return isFavorited
  } catch (error) {
    console.error('❌ Error checking favorite status:', error)
    return false
  }
}

/**
 * Get favorite ID for a video
 * @param {string} videoId - YouTube video ID
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Favorite ID or null if not found
 */
export const getFavoriteId = async (videoId, userId) => {
  try {
    if (!userId || !videoId) return null
    
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error getting favorite ID:', error)
      return null
    }
    
    return data?.id || null
  } catch (error) {
    console.error('❌ Error getting favorite ID:', error)
    return null
  }
}

/**
 * Remove a video from favorites
 * @param {string} videoId - YouTube video ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export const removeFavorite = async (videoId, userId) => {
  try {
    if (!userId || !videoId) return false
    
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('video_id', videoId)
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('❌ Error removing favorite:', error)
    return false
  }
}

/**
 * Load captions for a specific video
 * @param {string} videoId - YouTube video ID
 * @param {string} userId - User ID
 * @param {Function} setIsLoadingCaptions - Loading state setter
 * @param {Function} setDbError - Error state setter
 * @returns {Promise<Array>} Array of captions
 */
export const loadCaptions = async (videoId, userId, setIsLoadingCaptions, setDbError) => {
  try {
    setIsLoadingCaptions(true)
    setDbError(null)
    
    // First get the favorite record for this video
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single()
    
    if (favoriteError) {
      if (favoriteError.code === 'PGRST116') {
        // No favorite found, return empty array
        // No favorite found for video, no captions to load
        return []
      }
      throw favoriteError
    }
    
    // Now get captions for this favorite
    const { data, error } = await supabase
      .from('captions')
      .select('*')
      .eq('favorite_id', favoriteData.id)
      .order('start_time', { ascending: true })
    
    if (error) throw error
    
    // Transform database field names to frontend field names
    const transformedCaptions = (data || []).map(caption => ({
      id: caption.id,
      startTime: caption.start_time,
      endTime: caption.end_time,
      line1: caption.line1,
      line2: caption.line2,
      rowType: caption.row_type,
      serial_number: caption.serial_number, // Add serial number field
      favorite_id: caption.favorite_id,
      user_id: caption.user_id,
      created_at: caption.created_at,
      updated_at: caption.updated_at
    }))
    
    // Ensure all captions have serial numbers
    const captionsWithSerialNumbers = assignSerialNumbersToCaptions(transformedCaptions)
    
    // Transformed captions for frontend
    // Captions with serial numbers
    return captionsWithSerialNumbers
  } catch (error) {
    console.error('❌ Error loading captions:', error)
    setDbError('Failed to load captions')
    return []
  } finally {
    setIsLoadingCaptions(false)
  }
}

/**
 * Save a new caption to the database
 * @param {Object} captionData - Caption data object
 * @param {string} videoId - YouTube video ID
 * @param {string} userId - User ID
 * @param {Function} setIsLoadingCaptions - Loading state setter
 * @param {Function} setDbError - Error state setter
 * @returns {Promise<Object|null>} Saved caption or null if failed
 */
export const saveCaption = async (captionData, videoId, userId, setIsLoadingCaptions, setDbError) => {
  try {
    setIsLoadingCaptions(true)
    setDbError(null)
    
    // First ensure the video is favorited
    const isFavorited = await checkIfVideoFavorited(videoId, userId)
    if (!isFavorited) {
      console.error('❌ Cannot save caption: video not favorited')
      setDbError('Video must be favorited to save captions')
      return null
    }
    
    // Get the favorite record to link the caption
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single()
    
    if (favoriteError) throw favoriteError
    
    const { data, error } = await supabase
      .from('captions')
      .insert([{
        favorite_id: favoriteData.id,
        user_id: userId,
        row_type: captionData.rowType,
        start_time: captionData.startTime || '0:00',
        end_time: captionData.endTime || '0:05',
        line1: captionData.line1 || '',
        line2: captionData.line2 || '',
        serial_number: captionData.serial_number || null // Add serial number field
      }])
      .select()
    
    if (error) throw error
    
    // Transform the saved caption to frontend format
    const savedCaption = data[0]
    const transformedCaption = {
      id: savedCaption.id,
      startTime: savedCaption.start_time,
      endTime: savedCaption.end_time,
      line1: savedCaption.line1,
      line2: savedCaption.line2,
      rowType: savedCaption.row_type,
      serial_number: savedCaption.serial_number, // Add serial number field
      favorite_id: savedCaption.favorite_id,
      user_id: savedCaption.user_id,
      created_at: savedCaption.created_at,
      updated_at: savedCaption.updated_at
    }
    
    // Transformed saved caption
    return transformedCaption
  } catch (error) {
    console.error('❌ Error saving caption:', error)
    setDbError('Failed to save caption')
    return null
  } finally {
    setIsLoadingCaptions(false)
  }
}

/**
 * Update an existing caption in the database
 * @param {string} captionId - Caption ID to update
 * @param {Object} updates - Object containing updates
 * @param {string} userId - User ID for security
 * @param {Function} setIsLoadingCaptions - Loading state setter
 * @param {Function} setDbError - Error state setter
 * @returns {Promise<Object|null>} Updated caption or null if failed
 */
export const updateCaption = async (captionId, updates, userId, setIsLoadingCaptions, setDbError) => {
  try {
    setIsLoadingCaptions(true)
    setDbError(null)
    
    const { data, error } = await supabase
      .from('captions')
      .update({
        start_time: updates.startTime,
        end_time: updates.endTime,
        line1: updates.line1 || '',
        line2: updates.line2 || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', captionId)
      .eq('user_id', userId) // Security: only update own captions
      .select()
    
    if (error) throw error

    // Check if record was found and updated
    if (!data || data.length === 0) {
      console.warn('⚠️ Caption not found for update, record may have been deleted. ID:', captionId)
      return null // Return null to indicate record doesn't exist
    }

    // Transform the updated caption to frontend format
    const updatedCaption = data[0]
    const transformedCaption = {
      id: updatedCaption.id,
      startTime: updatedCaption.start_time,
      endTime: updatedCaption.end_time,
      line1: updatedCaption.line1,
      line2: updatedCaption.line2,
      rowType: updatedCaption.row_type,
      serial_number: updatedCaption.serial_number, // Add serial number field
      favorite_id: updatedCaption.favorite_id,
      user_id: updatedCaption.user_id,
      created_at: updatedCaption.created_at,
      updated_at: updatedCaption.updated_at
    }
    
    // Transformed updated caption
    return transformedCaption
  } catch (error) {
    console.error('❌ Error updating caption:', error)
    setDbError('Failed to update caption')
    return null
  } finally {
    setIsLoadingCaptions(false)
  }
}

/**
 * Delete a caption from the database
 * @param {string} captionId - Caption ID to delete
 * @param {string} userId - User ID for security
 * @param {Function} setIsLoadingCaptions - Loading state setter
 * @param {Function} setDbError - Error state setter
 * @returns {Promise<boolean>} True if successful, false if failed
 */
export const deleteCaption = async (captionId, userId, setIsLoadingCaptions, setDbError) => {
  try {
    setIsLoadingCaptions(true)
    setDbError(null)
    
    const { error } = await supabase
      .from('captions')
      .delete()
      .eq('id', captionId)
      .eq('user_id', userId) // Security: only delete own captions
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('❌ Error deleting caption:', error)
    setDbError('Failed to delete caption')
    return false
  } finally {
    setIsLoadingCaptions(false)
  }
}

/**
 * Add a video to favorites
 * @param {string} videoId - YouTube video ID
 * @param {string} videoTitle - Video title
 * @param {string} videoChannel - Channel name
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Favorite record or null if failed
 */
export const addFavorite = async (videoId, videoTitle, videoChannel, userId) => {
  try {
    if (!userId || !videoId) return null

    const { data, error } = await supabase
      .from('favorites')
      .insert([{
        user_id: userId,
        video_id: videoId,
        video_title: videoTitle,
        channel_name: videoChannel
      }])
      .select()

    if (error) throw error

    return data[0]
  } catch (error) {
    console.error('❌ Error adding favorite:', error)
    return null
  }
}

// ========================================
// CHORD CAPTION DATABASE OPERATIONS
// ========================================

/**
 * Get favorite ID for a video (chord caption specific)
 * @param {string} videoId - YouTube video ID
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Favorite ID or null if not found
 */
export const getFavoriteIdForVideo = async (videoId, userId) => {
  try {
    if (!userId || !videoId) return null

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error getting favorite ID for video:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('❌ Error getting favorite ID for video:', error)
    return null
  }
}

/**
 * Load chord captions for a specific video
 * @param {string} videoId - YouTube video ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of chord captions
 */
export const loadChordCaptions = async (videoId, userId) => {
  try {
    if (!userId || !videoId) return []

    // First get the favorite record for this video
    const favoriteId = await getFavoriteIdForVideo(videoId, userId)
    if (!favoriteId) {
      console.log('No favorite found for video, no chord captions to load')
      return []
    }

    // Now get chord captions for this favorite
    const { data, error } = await supabase
      .from('chord_captions')
      .select('*')
      .eq('favorite_id', favoriteId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('❌ Error loading chord captions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('❌ Error loading chord captions:', error)
    return []
  }
}

/**
 * Create a new chord caption record
 * @param {Object} chordData - Chord caption data
 * @param {string} favoriteId - Favorite ID to link to
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Created chord caption or null if failed
 */
export const createChordCaptionRecord = async (chordData, favoriteId, userId) => {
  try {
    if (!favoriteId || !userId || !chordData) return null

    const { data, error } = await supabase
      .from('chord_captions')
      .insert([{
        favorite_id: favoriteId,
        user_id: userId,
        chord_name: chordData.chord_name || '',
        start_time: chordData.start_time || '0:00',
        end_time: chordData.end_time || '0:05',
        chord_data: chordData.chord_data || {},
        display_order: chordData.display_order || 1,
        serial_number: chordData.serial_number || 1,
        sync_group_id: chordData.sync_group_id || null,
        is_master: chordData.is_master || false
      }])
      .select()

    if (error) {
      console.error('❌ Error creating chord caption:', error)
      return null
    }

    return data[0]
  } catch (error) {
    console.error('❌ Error creating chord caption:', error)
    return null
  }
}

/**
 * Update an existing chord caption record
 * @param {string} chordId - Chord caption ID to update
 * @param {Object} updates - Object containing updates
 * @param {string} userId - User ID for security
 * @returns {Promise<Object|null>} Updated chord caption or null if failed
 */
export const updateChordCaptionRecord = async (chordId, updates, userId) => {
  try {
    if (!chordId || !userId || !updates) return null

    const updateData = {
      updated_at: new Date().toISOString()
    }

    // Only include fields that are provided in updates
    if (updates.chord_name !== undefined) updateData.chord_name = updates.chord_name
    if (updates.start_time !== undefined) updateData.start_time = updates.start_time
    if (updates.end_time !== undefined) updateData.end_time = updates.end_time
    if (updates.chord_data !== undefined) updateData.chord_data = updates.chord_data
    if (updates.display_order !== undefined) updateData.display_order = updates.display_order
    if (updates.serial_number !== undefined) updateData.serial_number = updates.serial_number
    if (updates.sync_group_id !== undefined) updateData.sync_group_id = updates.sync_group_id
    if (updates.is_master !== undefined) updateData.is_master = updates.is_master

    const { data, error } = await supabase
      .from('chord_captions')
      .update(updateData)
      .eq('id', chordId)
      .eq('user_id', userId) // Security: only update own chord captions
      .select()

    if (error) {
      console.error('❌ Error updating chord caption:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ Chord caption not found for update, record may have been deleted. ID:', chordId)
      return null
    }

    return data[0]
  } catch (error) {
    console.error('❌ Error updating chord caption:', error)
    return null
  }
}

/**
 * Delete all chord captions for a video
 * @param {string} videoId - YouTube video ID
 * @param {string} userId - User ID for security
 * @returns {Promise<boolean>} True if successful, false if failed
 */
export const deleteAllChordCaptionsForVideo = async (videoId, userId) => {
  try {
    if (!videoId || !userId) return false

    // First get the favorite ID for this video
    const favoriteId = await getFavoriteIdForVideo(videoId, userId)
    if (!favoriteId) {
      console.log('No favorite found for video, no chord captions to delete')
      return true // Consider this successful since there's nothing to delete
    }

    const { error } = await supabase
      .from('chord_captions')
      .delete()
      .eq('favorite_id', favoriteId)
      .eq('user_id', userId) // Security: only delete own chord captions

    if (error) {
      console.error('❌ Error deleting all chord captions:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ Error deleting all chord captions:', error)
    return false
  }
}

/**
 * Duplicate a chord caption record
 * @param {Object} originalChord - Original chord caption to duplicate
 * @param {string} favoriteId - Favorite ID to link to
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Duplicated chord caption or null if failed
 */
export const duplicateChordCaptionRecord = async (originalChord, favoriteId, userId) => {
  try {
    if (!originalChord || !favoriteId || !userId) return null

    // Create a copy of the original chord with new timing
    const duplicateData = {
      favorite_id: favoriteId,
      user_id: userId,
      chord_name: originalChord.chord_name || '',
      start_time: originalChord.start_time || '0:00', // Caller should set appropriate timing
      end_time: originalChord.end_time || '0:05',     // Caller should set appropriate timing
      chord_data: originalChord.chord_data || {},
      display_order: originalChord.display_order || 1, // Caller should set appropriate order
      serial_number: originalChord.serial_number || 1, // Caller should set appropriate serial
      sync_group_id: originalChord.sync_group_id || null,
      is_master: false // Duplicates are never masters
    }

    const { data, error } = await supabase
      .from('chord_captions')
      .insert([duplicateData])
      .select()

    if (error) {
      console.error('❌ Error duplicating chord caption:', error)
      return null
    }

    return data[0]
  } catch (error) {
    console.error('❌ Error duplicating chord caption:', error)
    return null
  }
}
