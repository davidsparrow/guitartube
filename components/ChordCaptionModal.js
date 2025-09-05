/**
 * 🎸 Chord Caption Modal Component
 * 
 * Standalone modal for managing chord captions
 * Similar to CaptionModals.js but for chord-specific functionality
 * 
 * Features:
 * - Add new chord captions
 * - Edit existing chord captions
 * - Delete chord captions
 * - Duplicate chord captions
 * - Time validation with helpful suggestions
 * - Chord selection (Root Note + Modifier)
 * - Support for overlapping chord times
 */

import React, { useState, useEffect } from 'react'
import { FaPlus, FaTimes, FaEdit } from "react-icons/fa"
import { RiEdit2Fill } from "react-icons/ri"
import { PiCloudArrowDownFill, PiXCircleFill, PiTrashBold } from "react-icons/pi"
import { MdDeleteSweep } from "react-icons/md"
import { IoDuplicate } from "react-icons/io5"
import { 
  validateChordTimes, 
  isValidTimeFormat, 
  getTimeFormatSuggestion,
  ROOT_NOTES,
  CHORD_MODIFIERS,
  buildChordName,
  loadChordCaptions as loadChordsFromDB,
  createChordCaption as createChordInDB,
  updateChordCaption as updateChordInDB,
  deleteChordCaption as deleteChordInDB,
  deleteAllChordCaptionsForFavorite,
  parseTimeToSeconds
} from '../song_data_processing/chord_processing/chordCaptionUtils'
import { supabase } from '../lib/supabase/client'

/**
 * Chord Caption Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.showChordModal - Whether to show the modal
 * @param {Function} props.setShowChordModal - Function to close modal
 * @param {string} props.videoId - YouTube video ID of the current video
 * @param {number} props.videoDurationSeconds - Video duration in seconds
 * @param {number} props.currentTimeSeconds - Current video playback time
 * @param {Function} props.onChordsUpdated - Callback when chords are updated
 */
export const ChordCaptionModal = ({
  showChordModal,
  setShowChordModal,
  videoId,
  videoDurationSeconds = 0,
  currentTimeSeconds = 0,
  onChordsUpdated,
  userId,
  onCancel
}) => {
  // State for chord captions
  const [chords, setChords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // State for user default chord caption duration
  const [userDefaultChordCaptionDuration, setUserDefaultChordCaptionDuration] = useState(10)

  // Function to save user default chord caption duration
  const saveUserDefaultChordCaptionDuration = async (value) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ default_chord_caption_duration_seconds: value })
        .eq('user_id', userId)

      if (error) {
        console.error('Error saving chord caption duration:', error)
      } else {
        console.log('Saved default chord caption duration:', value)
      }
    } catch (error) {
      console.error('Error saving chord caption duration:', error)
    }
  }

  // Load user's chord caption duration preference
  useEffect(() => {
    const loadUserChordCaptionDuration = async () => {
      if (!userId) return

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('default_chord_caption_duration_seconds')
          .eq('user_id', userId)
          .single()

        if (error) {
          console.error('Error loading chord caption duration:', error)
        } else if (data?.default_chord_caption_duration_seconds) {
          setUserDefaultChordCaptionDuration(data.default_chord_caption_duration_seconds)
        }
      } catch (error) {
        console.error('Error loading chord caption duration:', error)
      }
    }

    loadUserChordCaptionDuration()
  }, [userId])

  // Load user's chord caption duration preference
  useEffect(() => {
    const loadUserChordCaptionDuration = async () => {
      if (!userId) return

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('default_chord_caption_duration_seconds')
          .eq('user_id', userId)
          .single()

        if (error) {
          console.error('Error loading chord caption duration:', error)
        } else if (data?.default_chord_caption_duration_seconds) {
          setUserDefaultChordCaptionDuration(data.default_chord_caption_duration_seconds)
        }
      } catch (error) {
        console.error('Error loading chord caption duration:', error)
      }
    }

    loadUserChordCaptionDuration()
  }, [userId])
  
  // State for adding new chords
  const [isAddingChord, setIsAddingChord] = useState(false)
  const [newChord, setNewChord] = useState({
    rootNote: '',
    modifier: '',
    start_time: '',
    end_time: ''
  })
  
  // State for editing existing chords
  const [editingChordId, setEditingChordId] = useState(null)
  const [editingChord, setEditingChord] = useState({
    chord_name: '',
    start_time: '',
    end_time: '',
    serial_number: null
  })
  
  // State for edit sub-modal
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Snapshot of original chord data for revert functionality
  const [originalChordSnapshot, setOriginalChordSnapshot] = useState(null)
  
  // Separate UI state for chord selection in edit mode
  const [editingChordUI, setEditingChordUI] = useState({
    rootNote: '',
    modifier: ''
  })
  
  // State for validation
  const [validationErrors, setValidationErrors] = useState([])
  
  // Load chord captions when modal opens
  useEffect(() => {
    if (showChordModal && videoId && userId) {
      loadChordCaptions()
    }
  }, [showChordModal, videoId, userId])
  
  /**
   * Load chord captions from database
   */
  const loadChordCaptions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // First get the favorite record for this video (similar to loadCaptions)
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()
      
      if (favoriteError) {
        if (favoriteError.code === 'PGRST116') {
          // No favorite found
          setError('Video must be favorited to load chord captions')
          return
        }
        throw favoriteError
      }
      
      // Now get chord captions for this favorite using the UUID
      const result = await loadChordsFromDB(favoriteData.id)
      
              if (result.success) {
          setChords(result.data || [])
          // Notify parent component to update its chordCaptions state
          if (onChordsUpdated) {
            onChordsUpdated(result.data || [])
          }
        } else {
        setError(result.error || 'Failed to load chord captions')
      }
      
    } catch (err) {
      console.error('❌ Error loading chord captions:', err)
      
      // Fallback to mock data for testing
      if (videoId.includes('test-')) {
        console.log('🔄 Using mock data for testing')
        const mockChords = [
          {
            id: 'mock-1',
            chord_name: 'Am',
            start_time: '0:00',
            end_time: '0:30',
            display_order: 1
          },
          {
            id: 'mock-2', 
            chord_name: 'C',
            start_time: '0:30',
            end_time: '1:00',
            display_order: 2
          },
          {
            id: 'mock-3',
            chord_name: 'F',
            start_time: '1:00',
            end_time: '1:30',
            display_order: 3
          },
          {
            id: 'mock-4',
            chord_name: 'G',
            start_time: '1:30',
            end_time: '2:00',
            display_order: 4
          }
        ]
        setChords(mockChords)
        setError(null)
      } else {
        setError('Failed to load chord captions')
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Handle chord selection (root note + modifier)
   */
  const handleChordSelection = (rootNote, modifier) => {
    const chordName = buildChordName(rootNote, modifier)
    setNewChord(prev => ({
      ...prev,
      rootNote,
      modifier,
      chord_name: chordName
    }))
  }
  
  /**
   * Handle time input changes
   */
  const handleTimeChange = (field, value) => {
    setNewChord(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(err => err.field !== field))
  }
  
  /**
   * Validate the complete chord before saving
   */
  const validateChord = () => {
    const errors = []
    
    if (!newChord.chord_name) {
      errors.push({ field: 'chord_name', message: 'Please select both root note and modifier', type: 'required' })
    }
    
    if (!newChord.start_time || !newChord.end_time) {
      errors.push({ field: 'timing', message: 'Please enter both start and end times', type: 'required' })
    }
    
    if (newChord.start_time && newChord.end_time) {
      if (!isValidTimeFormat(newChord.start_time)) {
        errors.push({ 
          field: 'start_time', 
          message: `Invalid start time format: ${getTimeFormatSuggestion(newChord.start_time)}`, 
          type: 'validation' 
        })
      }
      if (!isValidTimeFormat(newChord.end_time)) {
        errors.push({ 
          field: 'end_time', 
          message: `Invalid end time format: ${getTimeFormatSuggestion(newChord.end_time)}`, 
          type: 'validation' 
        })
      }
      
      if (isValidTimeFormat(newChord.start_time) && isValidTimeFormat(newChord.end_time)) {
        // Use our validation utility
        const validation = validateChordTimes(newChord, videoDurationSeconds)
        
        if (!validation.isValid) {
          validation.failures.forEach(failure => {
            errors.push({
              field: 'timing',
              message: failure.reason,
              type: 'validation'
            })
          })
        }
      }
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }
  
  /**
   * Save the new chord caption
   */
  const handleSaveChord = async () => {
    if (!validateChord()) {
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const chordData = {
        chord_name: newChord.chord_name,
        start_time: newChord.start_time,
        end_time: newChord.end_time,
        display_order: chords.length + 1
      }
      
      // For testing: add directly to local state (skip database)
      if (videoId.includes('test-')) {
        console.log('🔄 Adding mock chord for testing:', chordData)
        
        const mockChord = {
          id: `mock-${Date.now()}`, // Generate unique mock ID
          ...chordData
        }
        
        setChords(prev => [...prev, mockChord])
        
        // Reset form
        setNewChord({
          rootNote: '',
          modifier: '',
          start_time: '',
          end_time: ''
        })
        setIsAddingChord(false)
        setValidationErrors([])
        
        // Show success message
        setError('✅ Chord added successfully! (Mock mode)')
        setTimeout(() => setError(null), 3000) // Clear after 3 seconds
        
        // Notify parent component
        if (onChordsUpdated) {
          onChordsUpdated([...chords, mockChord])
        }
        
        console.log('✅ Mock chord added successfully:', mockChord)
        
      } else {
        // Real database call (when not testing)
        if (!userId) {
          setError('User ID is required to create chord captions')
          return
        }
        
        // Get the favorite ID (UUID) for this video
        const { data: favoriteData, error: favoriteError } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .single()
        
        if (favoriteError) {
          setError('Video must be favorited to create chord captions')
          return
        }
        
        const result = await createChordInDB(chordData, favoriteData.id, userId)
        
        if (result.success) {
          setChords(prev => [...prev, result.data])
          setNewChord({
            rootNote: '',
            modifier: '',
            start_time: '',
            end_time: ''
          })
          setIsAddingChord(false)
          setValidationErrors([])
          
          // Notify parent component
          if (onChordsUpdated) {
            onChordsUpdated([...chords, result.data])
          }
          
          console.log('✅ Chord saved successfully:', result.data)
        } else {
          setError(result.error || 'Failed to create chord caption')
        }
      }
      
    } catch (err) {
      console.error('❌ Error creating chord caption:', err)
      setError('Failed to create chord caption')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Cancel adding new chord
   */
  const handleCancelChord = () => {
    setNewChord({
      rootNote: '',
      modifier: '',
      start_time: '',
      end_time: ''
    })
    setValidationErrors([])
    setIsAddingChord(false)
  }
  
  /**
   * Start editing an existing chord
   */
  const handleEditChord = (chord) => {
    setEditingChordId(chord.id)
    
    // Create snapshot of original chord data for revert functionality
    setOriginalChordSnapshot({
      id: chord.id,
      chord_name: chord.chord_name,
      start_time: chord.start_time,
      end_time: chord.end_time,
      chord_data: chord.chord_data,
      display_order: chord.display_order
    })
    
    // Parse the chord name to get root note and modifier
    const chordName = chord.chord_name || ''
    let rootNote = ''
    let modifier = ''
    
    // Try to extract root note and modifier from chord name
    if (chordName) {
      // Look for root note (first character or first two characters)
      for (let i = 1; i <= 2; i++) {
        const possibleRoot = chordName.substring(0, i)
        if (ROOT_NOTES.some(note => note.value === possibleRoot)) {
          rootNote = possibleRoot
          modifier = chordName.substring(i)
          break
        }
      }
    }
    
    setEditingChord({
      chord_name: chord.chord_name,
      start_time: chord.start_time,
      end_time: chord.end_time,
      serial_number: chord.serial_number,
      rootNote: rootNote,
      modifier: modifier
    })
    
    // Set UI state for chord selection (separate from database fields)
    setEditingChordUI({
      rootNote: rootNote,
      modifier: modifier
    })
    
    setShowEditModal(true)
  }
  
  /**
   * Save new chord (ADD mode) - Uses unified modal
   */
  const handleSaveNewChord = async () => {
    // Build the chord name from UI state
    const chordName = buildChordName(editingChordUI.rootNote, editingChordUI.modifier)

    if (!chordName) {
      setError('Please select a chord')
      return
    }

    // Validate the chord data
    const errors = validateChordTimes(editingChord.start_time, editingChord.end_time)
    if (errors.length > 0) {
      setError(errors.join(', '))
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // First get the favorite ID for this video
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (favoriteError) {
        setError('Video must be favorited to create chord captions')
        return
      }

      // Prepare chord data for saving
      const chordData = {
        chord_name: chordName,
        start_time: editingChord.start_time,
        end_time: editingChord.end_time
      }

      // Save to database using existing function with all required parameters
      const result = await createChordInDB(chordData, favoriteData.id, userId)

      if (result.success) {
        // Add to local state and sort by start time
        const updatedChords = [...chords, result.data]
        const sortedChords = updatedChords.sort((a, b) =>
          parseTimeToSeconds(a.start_time) - parseTimeToSeconds(b.start_time)
        )
        setChords(sortedChords)

        // Notify parent component with sorted chords
        if (onChordsUpdated) {
          onChordsUpdated(sortedChords)
        }

        // Close modal and reset state
        setEditingChord({ chord_name: '', start_time: '', end_time: '', serial_number: null })
        setEditingChordUI({ rootNote: '', modifier: '' })
        setShowEditModal(false)

        setError('✅ Chord caption added successfully!')
        setTimeout(() => setError(null), 3000)
      } else {
        setError(result.error || 'Failed to save chord caption')
      }

    } catch (error) {
      console.error('Error saving new chord:', error)
      setError('Failed to save chord caption')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Save edited chord (EDIT mode)
   */
  const handleSaveEditedChord = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // For testing: update local state
      if (videoId.includes('test-')) {
        setChords(prev => prev.map(chord => 
          chord.id === editingChordId 
            ? { ...chord, ...editingChord }
            : chord
        ))
        
        // Notify parent component
        if (onChordsUpdated) {
          const updatedChords = chords.map(chord => 
            chord.id === editingChordId 
              ? { ...chord, ...editingChord }
              : chord
          )
          onChordsUpdated(updatedChords)
        }
        
        setEditingChordId(null)
        setEditingChord({ chord_name: '', start_time: '', end_time: '', serial_number: null })
        setShowEditModal(false)
        
        setError('✅ Chord updated successfully! (Mock mode)')
        setTimeout(() => setError(null), 3000)
        
      } else {
        // Real database update - filter out non-database fields
        const { rootNote, modifier, ...dbFields } = editingChord
        
        // Get the favorite ID for this video
        const { data: favoriteData, error: favoriteError } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .single()
        
        if (favoriteError) {
          setError('❌ Video must be favorited to update chord captions')
          return
        }
        
        const result = await updateChordInDB(editingChordId, dbFields, favoriteData.id)
        
        if (result.success) {
          // Update chords and re-sort by start time
          const updatedChords = chords.map(chord => 
            chord.id === editingChordId 
              ? { ...chord, ...dbFields }
              : chord
          )
          
          // Sort the updated chords by start time
          const sortedChords = sortChordsByStartTime(updatedChords)
          setChords(sortedChords)
          
          // Notify parent component
          if (onChordsUpdated) {
            onChordsUpdated(sortedChords)
          }
          
          setEditingChordId(null)
          setEditingChord({ chord_name: '', start_time: '', end_time: '' })
          setShowEditModal(false)
          
          console.log('✅ Chord updated successfully and list re-sorted')
        } else {
          setError(result.error || 'Failed to update chord caption')
        }
      }
      
    } catch (err) {
      console.error('❌ Error updating chord caption:', err)
      setError('Failed to update chord caption')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Cancel adding new chord (ADD mode)
   */
  const handleCancelAddChord = () => {
    // Reset state and close modal
    setEditingChord({ chord_name: '', start_time: '', end_time: '', serial_number: null })
    setEditingChordUI({ rootNote: '', modifier: '' })
    setShowEditModal(false)
    setError(null)
  }

  /**
   * Cancel editing chord (EDIT mode)
   */
  const handleCancelEditChord = () => {
    // Revert to original chord data from snapshot
    if (originalChordSnapshot) {
      setEditingChord({
        chord_name: originalChordSnapshot.chord_name,
        start_time: originalChordSnapshot.start_time,
        end_time: originalChordSnapshot.end_time
      })
      
      // Parse the original chord name to restore UI state
      const chordName = originalChordSnapshot.chord_name || ''
      let rootNote = ''
      let modifier = ''
      
      if (chordName) {
        for (let i = 1; i <= 2; i++) {
          const possibleRoot = chordName.substring(0, i)
          if (ROOT_NOTES.some(note => note.value === possibleRoot)) {
            rootNote = possibleRoot
            modifier = chordName.substring(i)
            break
          }
        }
      }
      
      setEditingChordUI({
        rootNote: rootNote,
        modifier: modifier
      })
    }
    
    setEditingChordId(null)
    setEditingChord({ chord_name: '', start_time: '', end_time: '' })
    setEditingChordUI({ rootNote: '', modifier: '' })
    setOriginalChordSnapshot(null)
    setShowEditModal(false)
  }
  
  /**
   * Duplicate a chord
   */
  const handleDuplicateChord = async (chord) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Create the duplicated chord data
      const chordData = {
        chord_name: chord.chord_name,
        start_time: chord.start_time, // Use original chord's start time
        end_time: calculateEndTime(chord.start_time, chord.end_time), // Calculate proper end time
        chord_data: chord.chord_data || null
      }
      
      // For testing: add to local state with mock ID
      if (videoId.includes('test-')) {
        const duplicatedChord = {
          ...chord,
          id: `duplicate-${Date.now()}`,
          start_time: chordData.start_time,
          end_time: chordData.end_time,
          display_order: chords.length + 1
        }
        
        setChords(prev => [...prev, duplicatedChord])
        
        // Notify parent component
        if (onChordsUpdated) {
          onChordsUpdated([...chords, duplicatedChord])
        }
        
        setError('✅ Chord duplicated successfully! (Mock mode)')
        setTimeout(() => setError(null), 3000)
        
      } else {
        // Real database call - save the duplicate immediately
        if (!userId) {
          setError('User ID is required to duplicate chord captions')
          return
        }
        
        // Get the favorite ID (UUID) for this video
        const { data: favoriteData, error: favoriteError } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .single()
        
        if (favoriteError) {
          setError('Video must be favorited to duplicate chord captions')
          return
        }
        
        const result = await createChordInDB(chordData, favoriteData.id, userId)
        
        if (result.success) {
          // Add the new chord and re-sort by start time
          const updatedChords = [...chords, result.data]
          const sortedChords = sortChordsByStartTime(updatedChords)
          setChords(sortedChords)
          
          // Notify parent component with sorted chords
          if (onChordsUpdated) {
            onChordsUpdated(sortedChords)
          }
          
          console.log('✅ Chord duplicated successfully and list re-sorted:', result.data)
        } else {
          setError(result.error || 'Failed to duplicate chord caption')
        }
      }
      
    } catch (err) {
      console.error('❌ Error duplicating chord caption:', err)
      setError('Failed to duplicate chord caption')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Delete a chord
   */
  const handleDeleteChord = async (chordId) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // For testing: remove from local state
      if (videoId.includes('test-')) {
        setChords(prev => prev.filter(chord => chord.id !== chordId))
        
        // Notify parent component
        if (onChordsUpdated) {
          onChordsUpdated(chords.filter(chord => chord.id !== chordId))
        }
        
        setError('✅ Chord deleted successfully! (Mock mode)')
        setTimeout(() => setError(null), 3000)
        
      } else {
        // Real database delete
        const result = await deleteChordInDB(chordId)
        
        if (result.success) {
          setChords(prev => prev.filter(chord => chord.id !== chordId))
          
          // Notify parent component
          if (onChordsUpdated) {
            onChordsUpdated(chords.filter(chord => chord.id !== chordId))
          }
          
          console.log('✅ Chord deleted successfully')
        } else {
          setError(result.error || 'Failed to delete chord caption')
        }
      }
      
    } catch (err) {
      console.error('❌ Error deleting chord caption:', err)
      setError('Failed to delete chord caption')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Delete all chords
   */
  const handleDeleteAllChords = async () => {
    if (chords.length === 0) return
    
    if (confirm('Are you sure you want to delete ALL chord captions? This action cannot be undone.')) {
      try {
        setIsLoading(true)
        setError(null)
        
        // First get the favorite ID for this video
        const { data: favoriteData, error: favoriteError } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .single()
        
        if (favoriteError) {
          setError('❌ Video must be favorited to delete chord captions')
          return
        }
        
        // Call the database function to delete all chords
        const result = await deleteAllChordCaptionsForFavorite(favoriteData.id)
        
        if (result.success) {
          // Clear local state after successful database deletion
          setChords([])
          
          // Notify parent component
          if (onChordsUpdated) {
            onChordsUpdated([])
          }
          
          setError(`✅ Successfully deleted ${result.deletedCount} chord captions!`)
          setTimeout(() => setError(null), 3000)
        } else {
          setError(`❌ Failed to delete: ${result.error}`)
          setTimeout(() => setError(null), 5000)
        }
      } catch (error) {
        console.error('❌ Error in handleDeleteAllChords:', error)
        setError(`❌ Failed to delete: ${error.message}`)
        setTimeout(() => setError(null), 5000)
      } finally {
        setIsLoading(false)
      }
    }
  }
  
  /**
   * Sort chords by start time (ascending) with creation order for identical times
   */
  const sortChordsByStartTime = (chordsToSort) => {
    return [...chordsToSort].sort((a, b) => {
      const aStart = parseTimeToSeconds(a.start_time)
      const bStart = parseTimeToSeconds(b.start_time)
      
      if (aStart !== bStart) {
        return aStart - bStart
      }
      
      // If start times are identical, maintain creation order (display_order)
      return (a.display_order || 0) - (b.display_order || 0)
    })
  }

  /**
   * Helper function to format seconds to time string
   */
  const formatTimeToTimeString = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * Helper function to calculate the end time of a chord based on its start time and duration.
   * This is needed because the duplicate functionality should maintain the original chord's duration.
   */
  const calculateEndTime = (startTime, originalEndTime) => {
    const startSeconds = parseTimeToSeconds(startTime);
    const originalEndSeconds = parseTimeToSeconds(originalEndTime);
    const durationSeconds = originalEndSeconds - startSeconds;
    return formatTimeToTimeString(startSeconds + durationSeconds);
  };
  
  if (!showChordModal) return null
  
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-black rounded-2xl shadow-2xl max-w-4xl w-full relative text-white border-2 border-white/80 max-h-[90vh] flex flex-col">
        {/* STICKY HEADER SECTION */}
        <div
          className="sticky top-0 z-1 p-3 sm:p-6 pb-3 sm:pb-4 rounded-t-2xl border-b border-white/20 relative bg-[url('/images/bass_strings2_BG.png')] bg-cover bg-center bg-no-repeat"
        >
          {/* Content wrapper with relative positioning */}
          <div className="relative z-10">
            {/* Modal Title - Left aligned with logo in upper right */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-3xl font-bold">
                Chord Captions Editor
              </h2>
              <img
                src="/images/gt_logoM_PlayButton.png"
                alt="GuitarTube Logo"
                className="h-6 sm:h-8 w-auto"
              />
            </div>

            {/* Header with action buttons */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              {/* Left side - Add Chord and Delete All buttons - aligned with title */}
              <div className="flex items-center space-x-1 sm:space-x-2 ml-0">
                {/* Add Button */}
                <button
                  onClick={() => {
                    // Calculate start time from current video time
                    const startTimeSeconds = Math.floor(currentTimeSeconds || 0)
                    const startTimeString = formatTimeToTimeString(startTimeSeconds)

                    // Calculate end time using user's preferred chord caption duration
                    const endTimeSeconds = startTimeSeconds + (userDefaultChordCaptionDuration || 10)
                    const endTimeString = formatTimeToTimeString(endTimeSeconds)

                    // Pre-populate the unified modal for ADD mode
                    setEditingChord({
                      chord_name: '',
                      start_time: startTimeString,
                      end_time: endTimeString,
                      serial_number: null // null indicates ADD mode
                    })

                    // Set UI state for chord selection
                    setEditingChordUI({
                      rootNote: '',
                      modifier: ''
                    })

                    // Open the unified modal
                    setShowEditModal(true)
                  }}
                  className="bg-transparent border-2 border-green-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm"
                  title="Add new chord caption"
                >
                  <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Add</span>
                </button>

                {/* Add Group Button */}
                <button
                  onClick={() => {/* TODO: No functionality needed yet */}}
                  className="bg-transparent border-2 border-yellow-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm"
                  title="Add new chord group"
                >
                  <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Group</span>
                </button>

                {/* Delete All Button */}
                <button
                  onClick={handleDeleteAllChords}
                  className="bg-transparent border-2 border-red-500 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm"
                  title="Delete all chord captions"
                >
                  <PiTrashBold className="w-4 h-4 sm:w-4 sm:h-4" />
                  <span>All</span>
                </button>
              </div>

              {/* Right side - Cancel and Save buttons - aligned with title */}
              <div className="flex items-center space-x-1 sm:space-x-2 mr-0">
                {/* Cancel Button */}
                <button
                  onClick={() => {
                    if (onCancel) {
                      onCancel()
                    }
                  }}
                  className="bg-transparent border-2 border-gray-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm"
                  title="Cancel changes"
                >
                  <PiXCircleFill className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Cancel</span>
                </button>

                {/* Save Button */}
                <button
                  onClick={() => setShowChordModal(false)}
                  className="bg-transparent border-2 border-blue-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm"
                  title="Save and close modal"
                >
                  <PiCloudArrowDownFill className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Save</span>
                </button>
              </div>
            </div>

          {/* Current Video Time Display - Below buttons, above captions */}
          <div className="mb-4 flex justify-between items-center">
            {/* Left side - Moment Display - aligned with title */}
            <div className="ml-0">
              <span className="text-gray-400 text-xs sm:text-sm font-medium">
                Moment: <span className="text-blue-400">{(() => {
                  const currentTime = Math.floor(currentTimeSeconds || 0)
                  const duration = Math.floor(videoDurationSeconds || 0)
                  const currentMinutes = Math.floor(currentTime / 60)
                  const currentSeconds = currentTime % 60
                  const durationMinutes = Math.floor(duration / 60)
                  const durationSeconds = duration % 60
                  return `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')} | ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`
                })()}</span>
              </span>
            </div>

            {/* Right side - New Caption Length - aligned with title */}
            <div className="flex items-center space-x-1 mr-0">
              <span className="text-gray-400 text-xs sm:text-sm font-medium">
                + Caption:
              </span>
              <input
                type="number"
                min="1"
                max="3600"
                value={userDefaultChordCaptionDuration || 10}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 10
                  setUserDefaultChordCaptionDuration(value)
                  // Save to user profile in Supabase
                  saveUserDefaultChordCaptionDuration(value)
                }}
                className="w-16 px-2 py-1 text-xs bg-transparent text-blue-400 border border-white/20 rounded focus:border-blue-400 focus:outline-none text-center"
              />
              <span className="text-gray-400 text-xs sm:text-sm font-medium">
                sec
              </span>
            </div>
          </div>
          </div>
        </div>

        {/* COMMENTED OUT: Blur overlay when adding chord */}
        {/* {isAddingChord && (
          <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-sm pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-32 bg-transparent pointer-events-auto"></div>
          </div>
        )} */}

        {/* SCROLLABLE CONTENT SECTION */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* COMMENTED OUT: Original Add New Chord Form - Replaced with unified modal */}
        {/* {isAddingChord && (
          <div
            className="rounded-2xl p-3 sm:p-6 mb-6 border-2 border-white/80 relative z-20 bg-[url('/images/fretted_finger7_BG.png')] bg-cover bg-center bg-no-repeat"
          >
            <div className="absolute inset-0 bg-black/40 rounded-2xl"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-3xl font-bold">Add New Chord Caption</h3>
                <img
                  src="/images/gt_logoM_PlayButton.png"
                  alt="GuitarTube Logo"
                  className="h-6 sm:h-8 w-auto"
                />
              </div>

              <div>

              <div className="mb-3 sm:mb-4">
                <div className="flex items-center space-x-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-400">Chord:</label>
                  <select
                    value={newChord.rootNote}
                    onChange={(e) => handleChordSelection(e.target.value, newChord.modifier)}
                    className="w-16 sm:w-20 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border border-white/20 rounded text-white text-xs sm:text-sm focus:border-blue-400 focus:outline-none"
                  >
                    <option value="" className="bg-gray-800">Root</option>
                    {ROOT_NOTES.map(note => (
                      <option key={note.value} value={note.value} className="bg-gray-800">
                        {note.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newChord.modifier}
                    onChange={(e) => handleChordSelection(newChord.rootNote, e.target.value)}
                    className="w-24 sm:w-32 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border border-white/20 rounded text-white text-xs sm:text-sm focus:border-blue-400 focus:outline-none"
                  >
                    <option value="" className="bg-gray-800">Major</option>
                    {CHORD_MODIFIERS.filter(m => m.value !== '').map(mod => (
                      <option key={mod.value} value={mod.value} className="bg-gray-800">
                        {mod.label}
                      </option>
                    ))}
                  </select>

                  <select
                    defaultValue="Open"
                    className="w-24 sm:w-32 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border border-white/20 rounded text-white text-xs sm:text-sm focus:border-blue-400 focus:outline-none"
                  >
                    <option value="Open" className="bg-gray-800">Open</option>
                    <option value="Pos1" className="bg-gray-800">Pos1</option>
                    <option value="Pos2" className="bg-gray-800">Pos2</option>
                    <option value="Pos3" className="bg-gray-800">Pos3</option>
                    <option value="Pos4" className="bg-gray-800">Pos4</option>
                    <option value="Pos5" className="bg-gray-800">Pos5</option>
                    <option value="Pos6" className="bg-gray-800">Pos6</option>
                    <option value="Pos7" className="bg-gray-800">Pos7</option>
                    <option value="Pos8" className="bg-gray-800">Pos8</option>
                    <option value="Pos1v1" className="bg-gray-800">Pos1v1</option>
                    <option value="Pos2v1" className="bg-gray-800">Pos2v1</option>
                    <option value="Pos2v2" className="bg-gray-800">Pos2v2</option>
                    <option value="Pos3v1" className="bg-gray-800">Pos3v1</option>
                    <option value="Pos3v2" className="bg-gray-800">Pos3v2</option>
                  </select>
                </div>
              </div>

            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div className="flex space-x-4 sm:space-x-6">
                <div className="flex items-center space-x-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-400">In:</label>
                  <input
                    type="text"
                    placeholder="1:30"
                    value={newChord.start_time}
                    onChange={(e) => handleTimeChange('start_time', e.target.value)}
                    className={`w-16 sm:w-20 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border rounded text-blue-400 text-xs sm:text-sm focus:outline-none ${
                      validationErrors.some(err => err.field === 'start_time')
                        ? 'border-red-500'
                        : 'border-white/20 focus:border-blue-400'
                    }`}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-400">Out:</label>
                  <input
                    type="text"
                    placeholder="2:00"
                    value={newChord.end_time}
                    onChange={(e) => handleTimeChange('end_time', e.target.value)}
                    className={`w-16 sm:w-20 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border rounded text-blue-400 text-xs sm:text-sm focus:outline-none ${
                      validationErrors.some(err => err.field === 'end_time')
                        ? 'border-red-500'
                        : 'border-white/20 focus:border-blue-400'
                    }`}
                  />
                </div>
              </div>

              <div className="flex space-x-1 sm:space-x-2">
                <button
                  onClick={handleCancelChord}
                  className="bg-transparent border-2 border-gray-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm font-medium"
                >
                  <PiXCircleFill className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Cancel</span>
                </button>

                <button
                  onClick={handleSaveChord}
                  disabled={isLoading}
                  className="bg-transparent border-2 border-blue-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PiCloudArrowDownFill className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{isLoading ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="mb-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-red-400 text-sm mb-1">
                    {error.message}
                  </div>
                ))}
              </div>
            )}
              </div>
            </div>
          </div>
        )} */}
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded text-red-400">
            {error}
          </div>
        )}
        
        {/* Chords List */}
        <div className="space-y-0">
          {chords.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No chord captions yet. Use the Add Chord button to create your first chord!</p>
            </div>
          ) : (
            chords.map((chord, index) => (
              <div 
                key={chord.id} 
                className="border-b border-gray-700 last:border-b-0"
              >

                  <div className="flex items-center justify-between py-2 sm:py-3">
                    <div className="flex-1">
                      <span className="text-sm sm:text-lg font-bold text-white">
                        {chord.chord_name}
                      </span>
                    </div>

                    <div className="flex-1 text-left">
                      <span className="text-xs sm:text-sm text-blue-400">
                        {chord.start_time} - {chord.end_time}
                      </span>
                    </div>

                    <div className="flex space-x-3 sm:space-x-3">
                      <button
                        onClick={() => handleEditChord(chord)}
                        className="p-0.5 sm:p-1 text-blue-400 hover:text-blue-300 hover:bg-white/10 rounded transition-colors"
                        title="Edit chord"
                      >
                        <FaEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      <button
                        onClick={() => handleDuplicateChord(chord)}
                        className="p-0.5 sm:p-1 text-green-600 hover:text-green-500 hover:bg-white/10 rounded transition-colors"
                        title="Duplicate chord"
                      >
                        <IoDuplicate className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      <button
                        onClick={() => handleDeleteChord(chord.id)}
                        className="p-0.5 sm:p-1 text-red-500 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                        title="Delete chord"
                      >
                        <PiTrashBold className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
              </div>
            ))
          )}
        </div>
        </div>
      </div>

      {/* Edit Chord Sub-Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-2xl shadow-2xl max-w-md w-full relative text-white p-3 sm:p-6 border-2 border-white/80 bg-[url('/images/fretted_finger7_BG.png')] bg-cover bg-center bg-no-repeat"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 15% dark overlay */}
            <div className="absolute inset-0 bg-black/15 rounded-2xl"></div>

            {/* Content wrapper with relative positioning */}
            <div className="relative z-10">
              {/* Sub-Modal Title */}
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {editingChord?.serial_number ? `Chord Caption #${editingChord.serial_number}` : 'Add Chord Caption'}
                </h3>
              </div>
            
              {/* Edit Form */}
              <div className="space-y-3 sm:space-y-4">
                {/* Chord Selection */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <label className="text-xs sm:text-sm font-bold text-gray-400">Chord:</label>
                    <select
                      value={editingChordUI.rootNote || ''}
                      onChange={(e) => {
                        const rootNote = e.target.value
                        const modifier = editingChordUI.modifier || ''
                        const chordName = buildChordName(rootNote, modifier)
                        setEditingChordUI(prev => ({ ...prev, rootNote }))
                        setEditingChord(prev => ({ ...prev, chord_name: chordName }))
                      }}
                      className="w-12 sm:w-14 px-1 py-1 sm:px-2 sm:py-1 bg-transparent border border-white/20 rounded text-white text-xs sm:text-sm focus:border-blue-400 focus:outline-none"
                    >
                      <option value="" className="bg-gray-800">Root</option>
                      {ROOT_NOTES.map(note => (
                        <option key={note.value} value={note.value} className="bg-gray-800">
                          {note.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={editingChordUI.modifier || ''}
                      onChange={(e) => {
                        const modifier = e.target.value
                        const rootNote = editingChordUI.rootNote || ''
                        const chordName = buildChordName(rootNote, modifier)
                        setEditingChordUI(prev => ({ ...prev, modifier }))
                        setEditingChord(prev => ({ ...prev, chord_name: chordName }))
                      }}
                      className="w-24 sm:w-28 px-1 py-1 sm:px-2 sm:py-1 bg-transparent border border-white/20 rounded text-white text-xs sm:text-sm focus:border-blue-400 focus:outline-none"
                    >
                      <option value="" className="bg-gray-800">Major</option>
                      {CHORD_MODIFIERS.filter(m => m.value !== '').map(mod => (
                        <option key={mod.value} value={mod.value} className="bg-gray-800">
                          {mod.label}
                        </option>
                      ))}
                    </select>

                    <select
                      defaultValue="Open"
                      className="w-20 sm:w-24 px-1 py-1 sm:px-2 sm:py-1 bg-transparent border border-white/20 rounded text-white text-xs sm:text-sm focus:border-blue-400 focus:outline-none"
                    >
                      <option value="Open" className="bg-gray-800">Open</option>
                      <option value="Pos1" className="bg-gray-800">Pos1</option>
                      <option value="Pos2" className="bg-gray-800">Pos2</option>
                      <option value="Pos3" className="bg-gray-800">Pos3</option>
                      <option value="Pos4" className="bg-gray-800">Pos4</option>
                      <option value="Pos5" className="bg-gray-800">Pos5</option>
                      <option value="Pos6" className="bg-gray-800">Pos6</option>
                      <option value="Pos7" className="bg-gray-800">Pos7</option>
                      <option value="Pos8" className="bg-gray-800">Pos8</option>
                      <option value="Pos1v1" className="bg-gray-800">Pos1v1</option>
                      <option value="Pos2v1" className="bg-gray-800">Pos2v1</option>
                      <option value="Pos2v2" className="bg-gray-800">Pos2v2</option>
                      <option value="Pos3v1" className="bg-gray-800">Pos3v1</option>
                      <option value="Pos3v2" className="bg-gray-800">Pos3v2</option>
                    </select>
                  </div>
                </div>

                {/* Time Inputs */}
                <div className="flex justify-center space-x-4 sm:space-x-6">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-400">In:</label>
                    <input
                      type="text"
                      value={editingChord.start_time}
                      onChange={(e) => setEditingChord(prev => ({ ...prev, start_time: e.target.value }))}
                      placeholder="1:30"
                      className="w-16 sm:w-20 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border rounded text-blue-400 text-xs sm:text-sm focus:outline-none border-white/20 focus:border-blue-400"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-400">Out:</label>
                    <input
                      type="text"
                      value={editingChord.end_time}
                      onChange={(e) => setEditingChord(prev => ({ ...prev, end_time: e.target.value }))}
                      placeholder="2:00"
                      className="w-16 sm:w-20 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border rounded text-blue-400 text-xs sm:text-sm focus:outline-none border-white/20 focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-1 sm:space-x-2 pt-2 sm:pt-4">
                  <button
                    onClick={editingChord?.serial_number ? handleCancelEditChord : handleCancelAddChord}
                    disabled={isLoading}
                    className="bg-transparent border-2 border-gray-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm disabled:opacity-50"
                  >
                    <PiXCircleFill className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Cancel</span>
                  </button>

                  <button
                    onClick={editingChord?.serial_number ? handleSaveEditedChord : handleSaveNewChord}
                    disabled={isLoading}
                    className="bg-transparent border-2 border-blue-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PiCloudArrowDownFill className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{isLoading ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChordCaptionModal
