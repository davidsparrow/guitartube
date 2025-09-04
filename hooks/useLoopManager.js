// hooks/useLoopManager.js - Custom hook for loop state management
import { useState, useCallback } from 'react'
import { createCustomLoop, updateCustomLoop, getUserLoops, deleteCustomLoop } from '../lib/supabase'
import {
  isValidXXFormat,
  parseTimeToSeconds,
  formatSecondsToTime,
  validateMinimumStartTime,
  validateMaximumEndTime,
  validateStartBeforeEnd
} from '../utils/captionUtils'

export default function useLoopManager() {
  // Loop segment states
  const [isLoopActive, setIsLoopActive] = useState(false)
  const [loopStartTime, setLoopStartTime] = useState('0:00')
  const [loopEndTime, setLoopEndTime] = useState('0:00')
  const [showLoopModal, setShowLoopModal] = useState(false)
  const [tempLoopStart, setTempLoopStart] = useState('0:00')
  const [tempLoopEnd, setTempLoopEnd] = useState('0:00')

  // Reset all loop state (useful for unfavoriting, changing videos, etc.)
  const resetLoopState = useCallback(() => {
    console.log('🔄 Resetting all loop state')
    setIsLoopActive(false)
    setLoopStartTime('0:00')
    setLoopEndTime('0:00')
    setShowLoopModal(false)
    setTempLoopStart('0:00')
    setTempLoopEnd('0:00')
  }, [])

  // Set loop times (useful for external control)
  const setLoopTimes = useCallback((startTime, endTime) => {
    console.log('⏰ Setting loop times:', { startTime, endTime })
    setLoopStartTime(startTime)
    setLoopEndTime(endTime)
  }, [])

  // Start loop with specific times
  const startLoop = useCallback((startTime, endTime) => {
    console.log('▶️ Starting loop:', { startTime, endTime })
    setLoopStartTime(startTime)
    setLoopEndTime(endTime)
    setIsLoopActive(true)
  }, [])

  // Stop loop
  const stopLoop = useCallback(() => {
    console.log('⏹️ Stopping loop')
    setIsLoopActive(false)
  }, [])

  // Toggle loop state
  const toggleLoop = useCallback(() => {
    console.log('🔄 Toggling loop state, current:', isLoopActive)
    setIsLoopActive(prev => !prev)
  }, [isLoopActive])

  // Open loop configuration modal
  const openLoopModal = useCallback(() => {
    console.log('📝 Opening loop configuration modal')
    setTempLoopStart(loopStartTime)
    setTempLoopEnd(loopEndTime)
    setShowLoopModal(true)
  }, [loopStartTime, loopEndTime])

  // Close loop configuration modal
  const closeLoopModal = useCallback(() => {
    console.log('❌ Closing loop configuration modal')
    setShowLoopModal(false)
  }, [])

  // Apply temporary loop settings
  const applyLoopSettings = useCallback(() => {
    console.log('✅ Applying loop settings:', { tempLoopStart, tempLoopEnd })
    setLoopStartTime(tempLoopStart)
    setLoopEndTime(tempLoopEnd)
    setIsLoopActive(true)
    setShowLoopModal(false)
  }, [tempLoopStart, tempLoopEnd])

  // Cancel loop settings (revert temp values)
  const cancelLoopSettings = useCallback(() => {
    console.log('❌ Cancelling loop settings')
    setTempLoopStart(loopStartTime)
    setTempLoopEnd(loopEndTime)
    setShowLoopModal(false)
  }, [loopStartTime, loopEndTime])

  // Get current loop status
  const getLoopStatus = useCallback(() => {
    return {
      isActive: isLoopActive,
      startTime: loopStartTime,
      endTime: loopEndTime,
      isModalOpen: showLoopModal,
      tempStart: tempLoopStart,
      tempEnd: tempLoopEnd
    }
  }, [isLoopActive, loopStartTime, loopEndTime, showLoopModal, tempLoopStart, tempLoopEnd])

  // Enhanced loop validation using same logic as text captions
  const validateLoopTimes = useCallback((startTime, endTime, videoDurationSeconds = null) => {
    console.log('🔍 LOOP VALIDATION - Starting validation...')
    console.log('🔍 Start time:', startTime)
    console.log('🔍 End time:', endTime)
    console.log('🔍 Video duration:', videoDurationSeconds)

    const results = {
      isValid: true,
      failures: [],
      suggestions: []
    }

    // Use imported validation functions from captionUtils

    // Rule 1: Format validation for start time
    if (!isValidXXFormat(startTime)) {
      results.isValid = false
      results.failures.push({
        rule: 'format_start',
        reason: `Start time (${startTime}) must be in MM:SS or H:MM:SS format (e.g., 0:00, 1:30, 2:20:18)`,
        suggestion: 'Enter time in MM:SS or H:MM:SS format (e.g., 0:00, 1:30, 2:20:18)'
      })
    }

    // Rule 2: Format validation for end time
    if (!isValidXXFormat(endTime)) {
      results.isValid = false
      results.failures.push({
        rule: 'format_end',
        reason: `End time (${endTime}) must be in MM:SS or H:MM:SS format (e.g., 0:00, 1:30, 2:20:18)`,
        suggestion: 'Enter time in MM:SS or H:MM:SS format (e.g., 0:00, 1:30, 2:20:18)'
      })
    }

    // If format is invalid, skip further validation
    if (!results.isValid) {
      console.log('❌ LOOP VALIDATION - Format validation failed')
      return results
    }

    // Rule 3: Start time ≥ 0:00
    const minStartValidation = validateMinimumStartTime(startTime)
    if (!minStartValidation.isValid) {
      results.isValid = false
      results.failures.push(minStartValidation)
    }

    // Rule 4: End time ≤ Video Duration (if provided)
    if (videoDurationSeconds && videoDurationSeconds > 0) {
      const maxEndValidation = validateMaximumEndTime(endTime, videoDurationSeconds)
      if (!maxEndValidation.isValid) {
        results.isValid = false
        results.failures.push(maxEndValidation)
      }
    }

    // Rule 5: Start < End
    const startEndValidation = validateStartBeforeEnd(startTime, endTime)
    if (!startEndValidation.isValid) {
      results.isValid = false
      results.failures.push(startEndValidation)
    }

    // Rule 6: Minimum loop duration (5 seconds)
    if (results.isValid) {
      const startSeconds = parseTimeToSeconds(startTime)
      const endSeconds = parseTimeToSeconds(endTime)
      const duration = endSeconds - startSeconds

      if (duration < 5) {
        results.isValid = false
        results.failures.push({
          rule: 'min_duration',
          reason: `Loop duration (${duration}s) is too short. Minimum loop duration is 5 seconds.`,
          suggestion: 'Increase loop duration to at least 5 seconds'
        })
      }
    }

    // Collect all suggestions
    results.suggestions = results.failures.map(failure => failure.suggestion)

    console.log('🔍 LOOP VALIDATION - Results:', results)
    return results
  }, [])

  // Save loop times to database
  const saveLoopTimes = useCallback(async (videoId, videoTitle, userId, startTime, endTime) => {
    console.log('💾 SAVING LOOP TIMES to database...')
    console.log('💾 Video ID:', videoId)
    console.log('💾 User ID:', userId)
    console.log('💾 Loop times:', { startTime, endTime })

    try {

      // Check if loop already exists for this user/video
      const existingResult = await getUserLoops(userId, videoId)
      const existingLoops = existingResult?.data || []
      const existingLoop = existingLoops.length > 0 ? existingLoops[0] : null

      const loopData = {
        user_id: userId,
        video_id: videoId,
        video_title: videoTitle || 'Unknown Video',
        loop_name: 'Practice Loop',
        start_time_seconds: parseTimeToSeconds(startTime),
        end_time_seconds: parseTimeToSeconds(endTime),
        loop_settings: { is_active: true }
      }

      console.log('🔍 Insert data for Supabase:', loopData)
      console.log('🔍 Data types check:')
      console.log('   - user_id type:', typeof loopData.user_id, loopData.user_id)
      console.log('   - video_id type:', typeof loopData.video_id, loopData.video_id)
      console.log('   - loop_name type:', typeof loopData.loop_name, loopData.loop_name)
      console.log('   - start_time_seconds type:', typeof loopData.start_time_seconds, loopData.start_time_seconds)
      console.log('   - end_time_seconds type:', typeof loopData.end_time_seconds, loopData.end_time_seconds)

      let result
      if (existingLoop) {
        console.log('🔄 Updating existing loop:', existingLoop.id)
        result = await updateCustomLoop(existingLoop.id, loopData)
      } else {
        console.log('➕ Creating new loop')
        result = await createCustomLoop(loopData)
      }

      // Check for database errors properly
      if (result && result.error) {
        console.error('❌ Database error saving loop times:', result.error)
        throw new Error(`Database error: ${result.error.message || result.error}`)
      }

      if (result && result.data) {
        console.log('✅ Loop times saved successfully:', result.data)
        return result.data
      } else {
        console.error('❌ Failed to save loop times - no data returned')
        return null
      }
    } catch (error) {
      console.error('❌ Error saving loop times:', error)
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status
      })
      return null
    }
  }, [])

  // Load loop times from database
  const loadLoopTimes = useCallback(async (videoId, userId) => {
    console.log('📥 LOADING LOOP TIMES from database...')
    console.log('📥 Video ID:', videoId)
    console.log('📥 User ID:', userId)

    try {
      const result = await getUserLoops(userId, videoId)

      // Check for database errors
      if (result && result.error) {
        console.error('❌ Database error loading loop times:', result.error)
        return null
      }

      const loops = result?.data || []

      if (loops && loops.length > 0) {
        const loop = loops[0] // Get first/active loop

        const startTime = formatSecondsToTime(loop.start_time_seconds)
        const endTime = formatSecondsToTime(loop.end_time_seconds)

        console.log('✅ Loop times loaded:', { startTime, endTime, loopData: loop })
        return { startTime, endTime, loopData: loop }
      } else {
        console.log('📭 No saved loop times found')
        return null
      }
    } catch (error) {
      console.error('❌ Error loading loop times:', error)
      return null
    }
  }, [])

  // Delete loop times from database
  const deleteLoopTimes = useCallback(async (videoId, userId) => {
    console.log('🗑️ DELETING LOOP TIMES from database...')
    console.log('🗑️ Video ID:', videoId)
    console.log('🗑️ User ID:', userId)

    try {
      const result = await getUserLoops(userId, videoId)

      // Check for database errors
      if (result && result.error) {
        console.error('❌ Database error finding loop to delete:', result.error)
        return false
      }

      const loops = result?.data || []

      if (loops && loops.length > 0) {
        const loop = loops[0]
        const deleteResult = await deleteCustomLoop(loop.id)

        if (deleteResult) {
          console.log('✅ Loop times deleted successfully')
          return true
        } else {
          console.error('❌ Failed to delete loop times')
          return false
        }
      } else {
        console.log('📭 No loop times to delete')
        return true
      }
    } catch (error) {
      console.error('❌ Error deleting loop times:', error)
      return false
    }
  }, [])

  return {
    // State
    isLoopActive,
    setIsLoopActive,
    loopStartTime,
    setLoopStartTime,
    loopEndTime,
    setLoopEndTime,
    showLoopModal,
    setShowLoopModal,
    tempLoopStart,
    setTempLoopStart,
    tempLoopEnd,
    setTempLoopEnd,
    
    // Utility functions
    resetLoopState,
    setLoopTimes,
    startLoop,
    stopLoop,
    toggleLoop,
    openLoopModal,
    closeLoopModal,
    applyLoopSettings,
    cancelLoopSettings,
    getLoopStatus,
    validateLoopTimes,

    // Persistence functions
    saveLoopTimes,
    loadLoopTimes,
    deleteLoopTimes
  }
}
