// components/watch/CaptionManager.js - Caption System Management Component
import { useState, useEffect, useRef } from 'react'
import {
  parseTimeToSeconds,
  formatSecondsToTime,
  timeToSeconds,
  assignSerialNumbersToCaptions,
  autoResolveCaptionConflicts,
  validateAllCaptions,
  calculateSmartCaptionDuration
} from '../../utils/captionUtils'
import {
  loadCaptions,
  saveCaption,
  updateCaption,
  deleteCaption
} from '../../utils/CaptionDatabase'
import {
  isPlayerReady as isPlayerReadyFromUtils,
  isVideoPlaying as isVideoPlayingFromUtils,
  showVideoPlayingRestriction as showVideoPlayingRestrictionFromUtils
} from '../../utils/videoPlayerUtils'

export default function CaptionManager({
  // Video and player props
  videoId,
  player,
  isVideoFavorited,
  user,
  
  // UI state props
  showCustomAlertModal,
  hideCustomAlertModal,
  getAdminMessage,
  planType,
  
  // Caption state management
  captions,
  setCaptions,
  isInCaptionMode,
  setIsInCaptionMode,
  editingCaptionId,
  setEditingCaptionId,
  
  // Loading and error states
  setIsLoadingCaptions,
  setDbError,
  
  // Footer controls
  tempLoopStart,
  setTempLoopStart,
  tempLoopEnd,
  setTempLoopEnd,
  
  // Access control
  canAccessLoops,
  handleFavoriteToggle,
  
  // User preferences
  userDefaultCaptionDuration
}) {
  // Local state for caption management
  const [originalCaptionsSnapshot, setOriginalCaptionsSnapshot] = useState(null)
  
  // Load captions when video loads or user changes
  useEffect(() => {
    const loadVideoCaptions = async () => {
      console.log('📝 Caption loading effect triggered')
      
      if (videoId && user?.id && isVideoFavorited) {
        console.log('✅ Loading captions for favorited video')
        const videoCaptions = await loadCaptions(videoId, user?.id, setIsLoadingCaptions, setDbError)
        setCaptions(videoCaptions)
      } else {
        console.log('⏭️ Clearing captions (not favorited or no user)')
        setCaptions([])
      }
    }
    
    loadVideoCaptions()
  }, [videoId, user?.id, isVideoFavorited, setCaptions, setIsLoadingCaptions, setDbError])

  // Effect to auto-sort captions by start time
  useEffect(() => {
    if (captions.length > 0) {
      const sortedCaptions = [...captions].sort((a, b) => {
        const timeA = timeToSeconds(a.startTime)
        const timeB = timeToSeconds(b.startTime)
        return timeA - timeB
      })
      
      // Only update if order actually changed
      const orderChanged = sortedCaptions.some((caption, index) => caption.id !== captions[index].id)
      if (orderChanged) {
        console.log('🔄 Auto-sorting captions by start time')
        setCaptions(sortedCaptions)
      }
    }
  }, [captions, setCaptions])

  // Effect to update displayed caption based on video time
  useEffect(() => {
    if (!player || !isPlayerReadyFromUtils(player) || captions.length === 0) return

    const captionUpdateInterval = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime()
        
        // SMART UPDATE: Only force re-render if NOT currently editing inline
        // This prevents the 500ms updates from clearing user input while typing
        if (!isInCaptionMode) {
          // Force re-render to update displayed caption
          setCaptions(prev => [...prev])
        }
      } catch (error) {
        console.error('Caption update error:', error)
      }
    }, 500) // Update every 500ms for smooth caption transitions

    return () => clearInterval(captionUpdateInterval)
  }, [player, captions.length, isInCaptionMode, setCaptions])

  // Get current caption at video time
  const getCurrentCaption = (currentTime, rowType = null) => {
    if (!captions || captions.length === 0) return null
    
    return captions.find(caption => {
      const startTime = timeToSeconds(caption.startTime)
      const endTime = timeToSeconds(caption.endTime)
      const isInTimeRange = currentTime >= startTime && currentTime <= endTime
      const isCorrectRow = rowType ? caption.rowType === rowType : true
      return isInTimeRange && isCorrectRow
    })
  }

  // Handle adding new caption from timeline
  const handleAddCaptionFromTimeline = async (rowNumber) => {
    console.log('➕ Adding new caption from timeline for row:', rowNumber)
    
    // Check access permissions
    if (!canAccessLoops()) {
      if (planType === 'freebird') {
        showCustomAlertModal(getAdminMessage('plan_upgrade_message', '🔒 Captions require a paid plan. Please upgrade to access this feature.'), [
          { text: 'UPGRADE PLAN', action: () => window.open('/pricing', '_blank') },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      if (!isVideoFavorited) {
        showCustomAlertModal(getAdminMessage('save_to_favorites_message', '⭐ Please save this video to favorites before editing captions.'), [
          { text: 'SAVE TO FAVORITES', action: () => { hideCustomAlertModal(); handleFavoriteToggle(); } },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      return
    }

    // Check if video is playing
    if (isVideoPlayingFromUtils(player)) {
      showVideoPlayingRestrictionFromUtils({
        getAdminMessage,
        showCustomAlertModal,
        hideCustomAlertModal
      })
      return
    }

    if (!player || !isPlayerReadyFromUtils(player)) {
      console.error('❌ Player not ready for caption creation')
      return
    }

    const currentTime = player.getCurrentTime()
    console.log('🎯 Current video time:', currentTime)

    // Check if caption already exists at current time
    const currentCaption = getCurrentCaption(currentTime, rowNumber)
    
    if (currentCaption) {
      console.log('⚠️ Caption already exists at current time')
      showCustomAlertModal('Caption already exists at this time', [
        { text: 'OK', action: hideCustomAlertModal }
      ])
      return
    }

    // Use utility function for smart duration calculation
    const { startTime, endTime, wasTrimmed, reason } = calculateSmartCaptionDuration(
      currentTime,
      captions,
      userDefaultCaptionDuration,
      player.getDuration ? player.getDuration() : 0
    )
    
    // Convert to MM:SS format
    const startTimeString = formatSecondsToTime(startTime)
    const endTimeString = formatSecondsToTime(endTime)

    const newCaption = {
      startTime: startTimeString,
      endTime: endTimeString,
      line1: '',
      line2: '',
      rowType: rowNumber
    }

    console.log('💾 Saving new caption to database:', newCaption)

    // Save caption to database
    const savedCaption = await saveCaption(newCaption, videoId, user?.id, setIsLoadingCaptions, setDbError)
    if (savedCaption) {
      // Add to local state with database ID
      setCaptions(prev => {
        const newCaptions = [...prev, savedCaption]
        
        // Auto-resolve any conflicts that may have been created
        const resolvedCaptions = autoResolveCaptionConflicts(newCaptions)
        
        // If conflicts were resolved, update the state with resolved captions
        if (resolvedCaptions !== newCaptions) {
          console.log('🔧 Conflicts were auto-resolved, updating captions state')
          return resolvedCaptions
        }
        
        return newCaptions
      })
      
      // Update footer fields to control this caption
      setTempLoopStart(startTimeString)
      setTempLoopEnd(endTimeString)
      
      // Set this as the editing caption
      setEditingCaptionId(savedCaption.id)
      
      // Set caption mode and editing ID for the new caption
      setIsInCaptionMode(true)
      setEditingCaptionId(savedCaption.id)
      
      // Capture original caption state for potential reversion
      setOriginalCaptionsSnapshot(JSON.parse(JSON.stringify(captions)))
      
      console.log('✅ New caption created and ready for editing')
    } else {
      console.error('❌ Failed to save new caption to database')
      setDbError('Failed to save new caption')
    }
  }

  // Handle saving newly added caption from footer
  const handleSaveNewCaption = async () => {
    if (editingCaptionId) {
      try {
        // Find the current caption to save
        const currentCaption = captions.find(caption => caption.id === editingCaptionId)
        if (currentCaption) {
          // Save any changes to the database
          const updatedCaption = await updateCaption(
            editingCaptionId,
            {
              startTime: currentCaption.startTime,
              endTime: currentCaption.endTime,
              line1: currentCaption.line1,
              line2: currentCaption.line2
            },
            user?.id,
            setIsLoadingCaptions,
            setDbError
          )

          if (updatedCaption) {
            console.log('✅ Caption changes saved to database')
          } else {
            console.error('❌ Failed to save caption changes to database')
            setDbError('Failed to save caption changes')
            return
          }
        }

        // Exit caption mode
        setIsInCaptionMode(false)
        setEditingCaptionId(null)

        // Reset footer fields
        setTempLoopStart('0:00')
        setTempLoopEnd('0:00')

        console.log('✅ Caption saved and caption mode exited')
      } catch (error) {
        console.error('❌ Error saving caption:', error)
        setDbError('Failed to save caption')
      }
    }
  }

  // Handle canceling new caption from footer
  const handleCancelNewCaption = async () => {
    console.log('❌ Canceling caption editing...')

    if (editingCaptionId) {
      try {
        // Check if this is a new caption (not in original snapshot)
        const isNewCaption = !originalCaptionsSnapshot?.some(c => c.id === editingCaptionId)

        if (isNewCaption) {
          // NEW RECORD: Delete from database and remove from state
          console.log('🗑️ Deleting new caption from database:', editingCaptionId)

          const deleteSuccess = await deleteCaption(editingCaptionId, user?.id, setIsLoadingCaptions, setDbError)
          if (deleteSuccess) {
            setCaptions(prev => prev.filter(caption => caption.id !== editingCaptionId))
            console.log('✅ New caption deleted and removed from state')
          } else {
            console.error('❌ Failed to delete new caption from database')
            setDbError('Failed to delete new caption')
          }
        } else {
          // EXISTING RECORD: Revert text changes
          const originalCaption = originalCaptionsSnapshot?.find(c => c.id === editingCaptionId)
          if (originalCaption) {
            setCaptions(prev => prev.map(caption =>
              caption.id === editingCaptionId
                ? { ...caption, line1: originalCaption.line1, line2: originalCaption.line2 }
                : caption
            ))
            console.log('✅ Existing caption text reverted and caption mode exited')
          }
        }

        // Exit caption mode for both cases
        setIsInCaptionMode(false)
        setEditingCaptionId(null)

        // Reset footer fields
        setTempLoopStart('0:00')
        setTempLoopEnd('0:00')

        // Reset original caption snapshot since we're exiting mode
        setOriginalCaptionsSnapshot(null)

      } catch (error) {
        console.error('❌ Error canceling caption:', error)
        setDbError('Failed to cancel caption')
      }
    }
  }

  // Handle inline editing from control strip
  const handleInlineEditCaption = (rowNumber) => {
    if (!canAccessLoops()) {
      if (planType === 'freebird') {
        showCustomAlertModal(getAdminMessage('plan_upgrade_message', '🔒 Captions require a paid plan. Please upgrade to access this feature.'), [
          { text: 'UPGRADE PLAN', action: () => window.open('/pricing', '_blank') },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      if (!isVideoFavorited) {
        showCustomAlertModal(getAdminMessage('save_to_favorites_message', '⭐ Please save this video to favorites before editing captions.'), [
          { text: 'SAVE TO FAVORITES', action: () => { hideCustomAlertModal(); handleFavoriteToggle(); } },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      return
    }

    // Check if video is playing
    if (isVideoPlayingFromUtils(player)) {
      showVideoPlayingRestrictionFromUtils({
        getAdminMessage,
        showCustomAlertModal,
        hideCustomAlertModal
      })
      return
    }

    if (!player || !isPlayerReadyFromUtils(player)) {
      console.error('❌ Player not ready for caption editing')
      return
    }

    const currentTime = player.getCurrentTime()
    console.log('✏️ Looking for caption to edit at time:', currentTime, 'for row:', rowNumber)

    // Find caption at current time for the specific row
    const currentCaption = getCurrentCaption(currentTime, rowNumber)

    if (!currentCaption) {
      console.log('⚠️ No caption found at current time for inline editing')
      showCustomAlertModal('No caption found at current video time for this row.', [
        { text: 'OK', action: hideCustomAlertModal }
      ])
      return
    }

    console.log('✅ Found caption for inline editing:', currentCaption)

    // Enter caption mode for editing
    setIsInCaptionMode(true)
    setEditingCaptionId(currentCaption.id)

    // Capture original caption state for potential reversion
    setOriginalCaptionsSnapshot(JSON.parse(JSON.stringify(captions)))

    // Update footer fields to control this caption
    setTempLoopStart(currentCaption.startTime)
    setTempLoopEnd(currentCaption.endTime)

    console.log('✏️ Entering inline edit mode for caption')
  }

  // Return the caption management functions and state
  return {
    // State
    originalCaptionsSnapshot,
    setOriginalCaptionsSnapshot,

    // Functions
    getCurrentCaption,
    handleAddCaptionFromTimeline,
    handleSaveNewCaption,
    handleCancelNewCaption,
    handleInlineEditCaption
  }
}
