// hooks/useLoopManager.js - Custom hook for loop state management
import { useState, useCallback } from 'react'

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

  // Validate loop times
  const validateLoopTimes = useCallback((startTime, endTime) => {
    // Basic validation - could be enhanced
    if (!startTime || !endTime) {
      return { valid: false, error: 'Start and end times are required' }
    }
    
    // Convert to seconds for comparison
    const parseTime = (timeStr) => {
      const parts = timeStr.split(':')
      if (parts.length !== 2) return 0
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    
    const startSeconds = parseTime(startTime)
    const endSeconds = parseTime(endTime)
    
    if (startSeconds >= endSeconds) {
      return { valid: false, error: 'End time must be after start time' }
    }
    
    if (endSeconds - startSeconds < 5) {
      return { valid: false, error: 'Loop must be at least 5 seconds long' }
    }
    
    return { valid: true }
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
    validateLoopTimes
  }
}
