// hooks/useCaptionManager.js - Custom hook for caption management
import { useState, useCallback } from 'react'
import {
  timeToSeconds,
  formatSecondsToTime,
  autoResolveCaptionConflicts,
  assignSerialNumbersToCaptions,
  calculateSmartCaptionDuration,
  validateAllCaptions
} from '../utils/captionUtils'
import {
  saveCaption,
  updateCaption,
  deleteCaption
} from '../utils/CaptionDatabase'

export default function useCaptionManager({
  videoId,
  user,
  setIsLoadingCaptions,
  setDbError,
  player,
  getVideoDuration,
  setConflictRowIndex,
  showCustomAlertModal,
  hideCustomAlertModal
}) {
  // Caption state
  const [captions, setCaptions] = useState([])
  const [isInCaptionMode, setIsInCaptionMode] = useState(false)
  const [editingCaptionId, setEditingCaptionId] = useState(null)
  const [originalCaptionsSnapshot, setOriginalCaptionsSnapshot] = useState(null)
  
  // Modal states
  const [showCaptionModal, setShowCaptionModal] = useState(false)
  const [editingCaption, setEditingCaption] = useState(null)
  const [isAddingNewCaption, setIsAddingNewCaption] = useState(false)
  // conflictRowIndex is passed as parameter from parent
  
  // Delete confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [captionToDelete, setCaptionToDelete] = useState(null)

  // Create a wrapped setCaptions that logs all calls
  const setCaptionsWithLogging = useCallback((newCaptions) => {
    if (typeof newCaptions === 'function') {
      setCaptions(prev => {
        const result = newCaptions(prev)
        console.log('📝 Caption state updated via function:', {
          previousCount: prev.length,
          newCount: result.length,
          change: result.length - prev.length
        })
        return result
      })
    } else {
      console.log('📝 Caption state updated directly:', {
        count: newCaptions.length,
        captions: newCaptions.map(c => ({ id: c.id, startTime: c.startTime, line1: c.line1?.substring(0, 20) + '...' }))
      })
      setCaptions(newCaptions)
    }
  }, [])

  // Handle saving captions (for modal)
  const handleSaveCaptions = async () => {
    console.log('💾 Starting caption save process...')
    console.log('💾 Current captions state:', captions)
    console.log('💾 Captions count:', captions.length)

    // Sort captions by start time
    const sortedCaptions = [...captions].sort((a, b) => {
      const aStart = timeToSeconds(a.startTime)
      const bStart = timeToSeconds(b.startTime)
      return aStart - bStart
    })

    console.log('💾 Sorted captions for save:', sortedCaptions)

    // Get video duration for validation
    let videoDurationSeconds = 0
    try {
      if (typeof getVideoDuration === 'function') {
        videoDurationSeconds = getVideoDuration()
        console.log('🔍 Video duration from getVideoDuration():', videoDurationSeconds)
      } else if (typeof player?.getDuration === 'function') {
        videoDurationSeconds = player.getDuration()
        console.log('🔍 Video duration from player.getDuration():', videoDurationSeconds)
      }
    } catch (error) {
      console.warn('⚠️ Could not get video duration for validation:', error)
    }

    // Validate all captions using comprehensive validation
    const validationResults = validateAllCaptions(sortedCaptions, videoDurationSeconds)

    if (!validationResults.isValid) {
      console.log('❌ Validation failed:', validationResults)

      // Find the first caption with validation failures for highlighting
      const firstFailedCaption = validationResults.captionResults.find(result => !result.isValid)
      if (firstFailedCaption && setConflictRowIndex) {
        setConflictRowIndex(firstFailedCaption.captionIndex)
      }

      // Get the first failure reason for the alert
      const firstFailure = validationResults.allFailures[0]

      // Show validation failure alert
      if (showCustomAlertModal && hideCustomAlertModal) {
        showCustomAlertModal(
          `Caption validation failed!\n\n` +
          `Rule ${firstFailure.rule} failed: ${firstFailure.reason}\n\n` +
          `Suggestion: ${firstFailure.suggestion}\n\n` +
          `Please fix the validation errors before saving.`,
          [
            {
              text: 'OK - I\'ll Fix It',
              action: hideCustomAlertModal
            }
          ]
        )
      } else {
        // Fallback error handling
        setDbError(`Caption validation failed: ${firstFailure.reason}`)
      }
      return
    }

    try {
      console.log('🔄 Saving', sortedCaptions.length, 'captions to database...')
      
      const savePromises = []
      
      for (const caption of sortedCaptions) {
        if (caption.id && typeof caption.id === 'string' && caption.id.length > 20) {
          // Existing caption with valid UUID - update if modified
          console.log('🔍 Updating existing caption:', caption.id)
          savePromises.push(updateCaption(caption.id, {
            startTime: caption.startTime,
            endTime: caption.endTime,
            line1: caption.line1,
            line2: caption.line2
          }, user?.id, setIsLoadingCaptions, setDbError))
        } else {
          // New caption (id is null, undefined, or invalid) - save it
          console.log('🔍 Saving new caption:', caption)
          savePromises.push(saveCaption({
            startTime: caption.startTime,
            endTime: caption.endTime,
            line1: caption.line1,
            line2: caption.line2,
            rowType: caption.rowType
          }, videoId, user?.id, setIsLoadingCaptions, setDbError))
        }
      }

      // Wait for all save operations to complete
      const results = await Promise.all(savePromises)
      
      // Check if all saves were successful
      const failedSaves = results.filter(result => !result)
      if (failedSaves.length > 0) {
        console.error('❌ Some caption saves failed:', failedSaves.length, 'out of', results.length)
        setDbError(`Failed to save ${failedSaves.length} captions`)
        return
      }

      console.log('✅ All captions saved successfully')
      
      // Update local state with any new IDs from database
      const updatedCaptions = sortedCaptions.map((caption, index) => {
        const result = results[index]
        if (result && result.id) {
          return { ...caption, id: result.id }
        }
        return caption
      })
      
      setCaptionsWithLogging(updatedCaptions)
      
    } catch (error) {
      console.error('❌ Error saving captions:', error)
      setDbError('Failed to save captions: ' + error.message)
      return
    }
    
    // Close modal
    setShowCaptionModal(false)
    setEditingCaption(null)
    setIsAddingNewCaption(false)
  }

  // Handle canceling caption editing
  const handleCancelCaptions = () => {
    console.log('❌ Canceling caption editing...')
    console.log('❌ Current captions before cancel:', captions)
    console.log('❌ Current captions count:', captions.length)
    console.log('❌ Original snapshot exists:', !!originalCaptionsSnapshot)
    console.log('❌ Original snapshot:', originalCaptionsSnapshot)

    // Revert all changes back to original state when modal was opened
    if (originalCaptionsSnapshot) {
      const revertedCaptions = JSON.parse(JSON.stringify(originalCaptionsSnapshot))
      console.log('❌ Reverting to snapshot:', revertedCaptions)
      console.log('❌ Snapshot count:', revertedCaptions.length)
      setCaptionsWithLogging(revertedCaptions)
      console.log('🔄 Reverted captions to original state')
    } else {
      console.log('⚠️ No original snapshot found - keeping current captions')
    }

    // Clear the snapshot
    setOriginalCaptionsSnapshot(null)
    console.log('🧹 Cleared original snapshot')
    
    // Close modal and reset states
    setShowCaptionModal(false)
    setIsAddingNewCaption(false)
    setEditingCaption(null)
    
    console.log('✅ Caption editing cancelled - all changes reverted')
  }

  // Handle duplicate caption
  const handleDuplicateCaption = async (serialNumber) => {
    console.log('📋 Duplicating caption with serial number:', serialNumber)
    
    try {
      // Find the target caption by serial number
      const targetCaption = captions.find(caption => caption.serial_number === serialNumber)
      if (!targetCaption) {
        console.error('❌ Caption not found for duplication:', serialNumber)
        setDbError('Caption not found for duplication')
        return
      }

      console.log('🎯 Found caption to duplicate:', targetCaption)

      // Create a copy of the caption
      const duplicatedCaption = {
        ...targetCaption,
        id: null, // Will get new ID when saved
        serial_number: null // Will be assigned new serial number
      }

      // Determine timing for the duplicated caption
      let newCaptionStartTime, newCaptionEndTime
      let modifiedCaptions = [...captions]

      // Check if there's a caption immediately after this one
      const currentStartTime = timeToSeconds(targetCaption.startTime)
      const currentEndTime = timeToSeconds(targetCaption.endTime)
      
      const nextCaption = captions.find(caption => {
        const nextStart = timeToSeconds(caption.startTime)
        return nextStart > currentEndTime
      })

      if (!nextCaption) {
        // Option A: No caption after - extend duration by 50%
        const originalDuration = currentEndTime - currentStartTime
        const extensionDuration = originalDuration * 0.5
        
        newCaptionStartTime = targetCaption.endTime
        newCaptionEndTime = formatSecondsToTime(currentEndTime + extensionDuration)
        
        console.log('📈 Extending caption duration (no next caption)')
      } else {
        // Option B: Between existing captions - use duplicate logic
        const startTime = timeToSeconds(targetCaption.startTime)
        const endTime = timeToSeconds(targetCaption.endTime)
        const originalDuration = endTime - startTime
        
        // Modify original caption - reduce duration by 50%
        const newOriginalEndTime = startTime + (originalDuration / 2)
        const newOriginalEndTimeFormatted = formatSecondsToTime(newOriginalEndTime)
        
        // Update original caption
        modifiedCaptions = modifiedCaptions.map(caption => 
          caption.serial_number === serialNumber 
            ? { ...caption, endTime: newOriginalEndTimeFormatted }
            : caption
        )
        
        // New caption takes the second half
        newCaptionStartTime = newOriginalEndTimeFormatted
        newCaptionEndTime = targetCaption.endTime
        
        console.log('✂️ Splitting caption duration (between captions)')
      }

      // Set timing for duplicated caption
      duplicatedCaption.startTime = newCaptionStartTime
      duplicatedCaption.endTime = newCaptionEndTime

      // Add duplicated caption to modified captions
      modifiedCaptions.push(duplicatedCaption)

      // Sort captions by start time
      const sortedCaptions = modifiedCaptions.sort((a, b) => {
        const aStart = timeToSeconds(a.startTime)
        const bStart = timeToSeconds(b.startTime)
        return aStart - bStart
      })

      // Assign new serial numbers
      const captionsWithSerialNumbers = assignSerialNumbersToCaptions(sortedCaptions)
      
      // Update state with sorted captions and new serial numbers
      setCaptionsWithLogging(captionsWithSerialNumbers)
      
      console.log('✅ Caption duplicated successfully with consistent logic')
      
    } catch (error) {
      console.error('❌ Error duplicating caption:', error)
      setDbError('Failed to duplicate caption')
    }
  }

  // Handle delete caption confirmation
  const handleDeleteCaption = (captionIndex) => {
    console.log('🔍 handleDeleteCaption called with index:', captionIndex)
    setCaptionToDelete(captionIndex)
    setShowDeleteConfirm(true)
    console.log('🔍 Set captionToDelete to:', captionIndex, 'and showDeleteConfirm to true')
  }

  // Handle delete all captions
  const handleDeleteAllCaptions = (showCustomAlertModal, hideCustomAlertModal, deleteCaption, user, setIsLoadingCaptions, setDbError) => {
    console.log('🗑️ DELETE ALL CAPTIONS clicked')
    console.log('🗑️ Current captions count:', captions.length)
    console.log('🗑️ Current captions:', captions)

    if (captions.length === 0) {
      console.log('🗑️ No captions to delete, returning early')
      return
    }

    // Show confirmation dialog
    console.log('🗑️ Showing delete all confirmation dialog')
    showCustomAlertModal(
      'Are you sure you want to delete ALL captions? This action cannot be undone.',
      [
        {
          text: 'DELETE ALL',
          action: async () => {
            console.log('🗑️ DELETE ALL CONFIRMED - Starting deletion process')
            console.log('🗑️ Captions to delete:', captions)
            console.log('🗑️ Captions count before deletion:', captions.length)

            try {
              // Delete all captions from database
              for (const caption of captions) {
                if (caption.id) {
                  console.log('🗑️ Deleting caption from DB:', caption.id, caption.text)
                  await deleteCaption(caption.id, user?.id, setIsLoadingCaptions, setDbError)
                }
              }

              console.log('🗑️ All captions deleted from database')

              // Clear local state
              console.log('🗑️ Clearing local caption state')
              setCaptionsWithLogging([])
              console.log('🗑️ Local captions cleared - count should be 0')
              hideCustomAlertModal()

            } catch (error) {
              console.error('❌ Error deleting all captions:', error)
              setDbError('Failed to delete all captions')
            }
          }
        },
        {
          text: 'CANCEL',
          action: () => {
            console.log('🗑️ DELETE ALL CANCELLED - No changes made')
            console.log('🗑️ Captions remain unchanged, count:', captions.length)
            hideCustomAlertModal()
          }
        }
      ]
    )
  }

  // Handle opening caption modal with snapshot creation and access control
  const handleOpenCaptionModal = (rowNumber, accessControlParams) => {
    const {
      isVideoPlayingFromUtils,
      player,
      showVideoPlayingRestrictionFromUtils,
      getAdminMessage,
      showCustomAlertModal,
      hideCustomAlertModal,
      canAccessLoops,
      planType,
      isVideoFavorited,
      handleFavoriteToggle
    } = accessControlParams

    // Check if video is playing
    if (isVideoPlayingFromUtils(player)) {
      showVideoPlayingRestrictionFromUtils({
        getAdminMessage,
        showCustomAlertModal,
        hideCustomAlertModal
      })
      return
    }

    // Check if user can access captions (same as loops)
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

    console.log('📸 MODAL OPENING - Creating captions snapshot')
    console.log('📸 Current captions for snapshot:', captions)
    console.log('📸 Current captions count:', captions.length)

    setOriginalCaptionsSnapshot(JSON.parse(JSON.stringify(captions)))
    console.log('📸 Snapshot created successfully')

    // Open caption edit modal for the specific row
    console.log('📸 Opening caption modal')
    setShowCaptionModal(true)
    setEditingCaption({
      rowType: rowNumber,
      rowName: rowNumber === 1 ? 'Text Captions' : rowNumber === 2 ? 'Chords Captions' : 'Auto-Gen'
    })
  }

  // Handle adding new caption from timeline (works with empty captions)
  const handleAddCaptionFromTimeline = async (accessControlParams) => {
    const {
      showCustomAlertModal,
      hideCustomAlertModal,
      player,
      videoId,
      user,
      setIsLoadingCaptions,
      setDbError,
      userDefaultCaptionDuration
    } = accessControlParams

    console.log('➕ Adding new caption from timeline')

    const currentTime = player.getCurrentTime()
    console.log('🎯 Current video time:', currentTime)

    // RULE 4: Smart caption placement with forward search
    let startTime = currentTime
    let endTime = currentTime + (userDefaultCaptionDuration || 10)
    const videoDuration = player.getDuration ? player.getDuration() : 0

    // Check if initial placement would exceed video duration
    if (videoDuration > 0 && endTime > videoDuration) {
      console.error(`❌ Cannot find ${userDefaultCaptionDuration || 10} seconds of space - would exceed video duration`)
      showCustomAlertModal(`Cannot find ${userDefaultCaptionDuration || 10} seconds of space to add a new Caption`, [
        { text: 'OK', action: hideCustomAlertModal }
      ])
      return
    }

    // Check if caption already exists at current time for text captions (rowType 1)
    const currentCaption = captions.find(caption => {
      const captionStart = timeToSeconds(caption.startTime)
      const captionEnd = timeToSeconds(caption.endTime)
      return startTime >= captionStart && endTime <= captionEnd && caption.rowType === 1
    })

    if (currentCaption) {
      console.log('🔍 Collision detected at current time, searching forward...')

      // Find next available space by starting at the end of overlapping caption
      const overlappingCaptions = captions
        .filter(caption => caption.rowType === 1)
        .map(caption => ({
          start: timeToSeconds(caption.startTime),
          end: timeToSeconds(caption.endTime)
        }))
        .sort((a, b) => a.start - b.start)

      // Try starting at the end of the current overlapping caption
      const overlappingCaption = overlappingCaptions.find(cap =>
        currentTime >= cap.start && currentTime <= cap.end
      )

      if (overlappingCaption) {
        startTime = overlappingCaption.end
        endTime = startTime + (userDefaultCaptionDuration || 10)
        console.log(`🔄 Trying to start at end of overlapping caption: ${startTime}s`)
      }

      // Check if this new position still has conflicts, search forward
      let searchAttempts = 0
      const maxSearchAttempts = 50 // Prevent infinite loops
      const videoDuration = player.getDuration ? player.getDuration() : 0

      while (searchAttempts < maxSearchAttempts) {
        // Check if current position conflicts with any existing caption
        const hasConflict = overlappingCaptions.some(cap =>
          (startTime >= cap.start && startTime < cap.end) ||
          (endTime > cap.start && endTime <= cap.end) ||
          (startTime <= cap.start && endTime >= cap.end)
        )

        if (!hasConflict) {
          // Found a good spot!
          console.log(`✅ Found available space at ${startTime}s - ${endTime}s`)
          break
        }

        // Move to next potential position (end of next conflicting caption)
        const nextConflict = overlappingCaptions.find(cap => cap.start >= startTime)
        if (nextConflict) {
          startTime = nextConflict.end
          endTime = startTime + (userDefaultCaptionDuration || 10)
          console.log(`🔄 Moving to next position: ${startTime}s`)
        } else {
          // No more captions ahead, try moving forward by user duration
          startTime = endTime
          endTime = startTime + (userDefaultCaptionDuration || 10)
        }

        // Check if we're near end of video
        if (videoDuration > 0 && endTime > videoDuration) {
          console.error(`❌ Cannot find ${userDefaultCaptionDuration || 10} seconds of space`)
          showCustomAlertModal(`Cannot find ${userDefaultCaptionDuration || 10} seconds of space to add a new Caption`, [
            { text: 'OK', action: hideCustomAlertModal }
          ])
          return
        }

        searchAttempts++
      }

      if (searchAttempts >= maxSearchAttempts) {
        console.error('❌ Could not find available space after maximum search attempts')
        showCustomAlertModal('Could not find available space for new caption', [
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
    }

    // Convert to MM:SS format
    const startTimeString = formatSecondsToTime(startTime)
    const endTimeString = formatSecondsToTime(endTime)

    const newCaption = {
      startTime: startTimeString,
      endTime: endTimeString,
      line1: '',
      line2: '',
      rowType: 1, // Text captions type
      text: '' // For compatibility
    }

    console.log('💾 Saving new caption to database:', newCaption)

    // Save caption to database
    const savedCaption = await saveCaption(newCaption, videoId, user?.id, setIsLoadingCaptions, setDbError)
    if (savedCaption) {
      // Add to local state with database ID
      setCaptionsWithLogging(prev => {
        const newCaptions = [...prev, savedCaption]
        console.log('✅ New caption added to local state:', savedCaption)
        return newCaptions
      })

      console.log('✅ New caption created successfully - ready for editing in modal')
    } else {
      console.error('❌ Failed to save new caption to database')
      setDbError('Failed to save new caption')
    }
  }

  return {
    // State
    captions,
    setCaptions: setCaptionsWithLogging,
    isInCaptionMode,
    setIsInCaptionMode,
    editingCaptionId,
    setEditingCaptionId,
    originalCaptionsSnapshot,
    setOriginalCaptionsSnapshot,
    
    // Modal states
    showCaptionModal,
    setShowCaptionModal,
    editingCaption,
    setEditingCaption,
    isAddingNewCaption,
    setIsAddingNewCaption,
    
    // Delete states
    showDeleteConfirm,
    setShowDeleteConfirm,
    captionToDelete,
    setCaptionToDelete,
    
    // Functions
    handleSaveCaptions,
    handleCancelCaptions,
    handleDuplicateCaption,
    handleDeleteCaption,
    handleDeleteAllCaptions,
    handleOpenCaptionModal,
    handleAddCaptionFromTimeline
  }
}
