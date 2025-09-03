// hooks/useCaptionManager.js - Custom hook for caption management
import { useState, useCallback } from 'react'
import {
  timeToSeconds,
  formatSecondsToTime,
  autoResolveCaptionConflicts,
  assignSerialNumbersToCaptions
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
  setDbError
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
  const [conflictRowIndex, setConflictRowIndex] = useState(null)
  
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

    // Validate all captions before saving
    const validationErrors = []
    for (const caption of sortedCaptions) {
      if (!caption.startTime || !caption.endTime) {
        validationErrors.push(`Caption missing time data: ${caption.line1 || 'Empty caption'}`)
      }
      
      const startSeconds = timeToSeconds(caption.startTime)
      const endSeconds = timeToSeconds(caption.endTime)
      
      if (startSeconds >= endSeconds) {
        validationErrors.push(`Invalid time range for caption: ${caption.line1 || 'Empty caption'}`)
      }
    }

    if (validationErrors.length > 0) {
      console.error('❌ Caption validation failed:', validationErrors)
      setDbError('Caption validation failed: ' + validationErrors.join(', '))
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
    conflictRowIndex,
    setConflictRowIndex,
    
    // Delete states
    showDeleteConfirm,
    setShowDeleteConfirm,
    captionToDelete,
    setCaptionToDelete,
    
    // Functions
    handleSaveCaptions,
    handleCancelCaptions,
    handleDuplicateCaption,
    handleDeleteCaption
  }
}
