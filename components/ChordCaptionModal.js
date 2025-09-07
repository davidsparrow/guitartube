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

import { useState, useEffect } from 'react'
import { FaPlus, FaEdit } from "react-icons/fa"
import { PiCloudArrowDownFill, PiXCircleFill, PiTrashBold } from "react-icons/pi"
import { IoDuplicate } from "react-icons/io5"
import {
  validateChordTimes,
  calculateEndTime,
  formatTimeToTimeString,
  ROOT_NOTES,
  CHORD_MODIFIERS,
  buildChordName,
  parseTimeToSeconds
} from '../song_data_processing/chord_processing/chordCaptionUtils'
import { supabase } from '../lib/supabase/client'

/**
 * Sort chord captions by start time, then by creation time
 * @param {Array} chords - Array of chord captions
 * @returns {Array} Sorted array of chord captions
 */
const sortChordsByTime = (chords) => {
  return [...chords].sort((a, b) => {
    // First sort by start time
    const aStartSeconds = parseTimeToSeconds(a.start_time || '0:00')
    const bStartSeconds = parseTimeToSeconds(b.start_time || '0:00')

    if (aStartSeconds !== bStartSeconds) {
      return aStartSeconds - bStartSeconds
    }

    // If start times are equal, sort by creation time
    const aCreated = new Date(a.created_at || 0)
    const bCreated = new Date(b.created_at || 0)
    return aCreated - bCreated
  })
}
import {
  loadChordCaptions as loadChordCaptionsFromDB,
  createChordCaption as createChordCaptionInDB,
  updateChordCaption as updateChordCaptionInDB,
  deleteChordCaption as deleteChordCaptionFromDB,
  deleteAllChordCaptions as deleteAllChordCaptionsFromDB
} from '../song_data_processing/chord_processing/ChordCaptionDatabase'

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
  userId
}) => {
  // State for chord captions
  const [chords, setChords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Smart cancel functionality - JSON blob snapshot (like text-captions)
  const [originalChordsBlob, setOriginalChordsBlob] = useState(null)

  // Add Group dialog state
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  // Manage Groups modal state
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false)
  const [availableGroups, setAvailableGroups] = useState([])
  const [selectedGroupToDelete, setSelectedGroupToDelete] = useState('')

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
  
  // State for editing existing chords
  const [editingChordId, setEditingChordId] = useState(null)
  const [editingChord, setEditingChord] = useState({
    chord_name: '',
    start_time: '',
    end_time: '',
    serial_number: null,
    fret_position: 'Open' // Default position
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
      // Use existing specialized utility function instead of direct supabase calls
      const chordsData = await loadChordCaptionsFromDB(videoId, userId, setIsLoading, setError)

      if (chordsData && chordsData.length >= 0) {
        setChords(chordsData)

        // 🎸 CAPTURE ORIGINAL CHORDS BLOB FOR SMART CANCEL (LIKE TEXT-CAPTIONS) 🎸
        if (!originalChordsBlob) {
          const blob = JSON.parse(JSON.stringify(chordsData))
          setOriginalChordsBlob(blob)
          console.log('🎸 CHORD BLOB CAPTURED:', blob.length, 'chords')
        }

        // Notify parent component to update its chordCaptions state
        if (onChordsUpdated) {
          onChordsUpdated(chordsData)
        }

        // Load available groups for dropdown
        console.log('🎸 LOAD CHORDS - Loading available groups...')
        await loadAvailableGroups()
        console.log('🎸 LOAD CHORDS - Groups loaded, availableGroups length:', availableGroups.length)
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
      fret_position: chord.fret_position || 'Open',
      chord_group_id: chord.chord_group_id,
      chord_group_name: chord.chord_group_name,
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
    console.log('🎸 SAVE NEW CHORD - Starting save process...')
    console.log('🎸 SAVE NEW CHORD - editingChord:', editingChord)
    console.log('🎸 SAVE NEW CHORD - editingChordUI:', editingChordUI)

    // Build the chord name from UI state
    const chordName = buildChordName(editingChordUI.rootNote, editingChordUI.modifier)
    console.log('🎸 SAVE NEW CHORD - Built chord name:', chordName)

    if (!chordName) {
      console.log('❌ SAVE NEW CHORD - No chord name provided')
      setError('Please select a chord')
      return
    }

    // Validate the chord data
    const errors = validateChordTimes(editingChord.start_time, editingChord.end_time)
    if (errors.length > 0) {
      console.log('❌ SAVE NEW CHORD - Validation errors:', errors)
      setError(errors.join(', '))
      return
    }

    try {
      // Prepare chord data for saving (including group and position information)
      const chordData = {
        chord_name: chordName,
        start_time: editingChord.start_time,
        end_time: editingChord.end_time,
        // NEW SCHEMA: Include group information if selected
        chord_group_name: editingChord.chord_group_name || null,
        // NEW FIELD: Include fret position information
        fret_position: editingChord.fret_position || null
      }
      console.log('🎸 SAVE NEW CHORD - Prepared chord data:', chordData)

      // Save to database using existing function with all required parameters
      console.log('🎸 SAVE NEW CHORD - Calling createChordCaptionInDB...')
      const createdChord = await createChordCaptionInDB(chordData, videoId, userId, setIsLoading, setError)
      console.log('🎸 SAVE NEW CHORD - createChordCaptionInDB result:', createdChord)

      if (createdChord) {
        console.log('✅ SAVE NEW CHORD - Chord created successfully, updating local state...')

        // Add to local state and sort by start time + creation time
        const updatedChords = sortChordsByTime([...chords, createdChord])
        setChords(updatedChords)
        console.log('✅ SAVE NEW CHORD - Local state updated with', updatedChords.length, 'chords')

        // Notify parent component with sorted chords
        if (onChordsUpdated) {
          onChordsUpdated(updatedChords)
          console.log('✅ SAVE NEW CHORD - Parent component notified')
        }

        // Close modal and reset state
        setEditingChord({ chord_name: '', start_time: '', end_time: '', serial_number: null, fret_position: 'Open' })
        setEditingChordUI({ rootNote: 'C', modifier: '' })
        setShowEditModal(false)
        console.log('✅ SAVE NEW CHORD - Modal closed and state reset')

        setError('✅ Chord caption added successfully!')
        setTimeout(() => setError(null), 3000)

        // Check if chord is in a group and offer to sync group times
        console.log('🎸 SAVE NEW CHORD - Checking for group sync...')
        await handleIndividualChordGroupSync(createdChord)
        console.log('✅ SAVE NEW CHORD - Process completed successfully')
      } else {
        console.log('❌ SAVE NEW CHORD - createChordCaptionInDB returned null/falsy')
        setError('Failed to save chord caption - no data returned')
      }
      // Error handling is done by the utility function

    } catch (error) {
      console.error('❌ SAVE NEW CHORD - Error in try/catch:', error)
      setError('Failed to save chord caption')
    } finally {
      setIsLoading(false)
      console.log('🎸 SAVE NEW CHORD - Finally block executed, loading set to false')
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
        setEditingChord({ chord_name: '', start_time: '', end_time: '', serial_number: null, fret_position: 'Open' })
        setShowEditModal(false)
        
        setError('✅ Chord updated successfully! (Mock mode)')
        setTimeout(() => setError(null), 3000)
        
      } else {
        // Real database update using centralized utility function
        const { rootNote, modifier, ...dbFields } = editingChord

        // Use existing specialized utility function instead of direct supabase calls
        const updatedChord = await updateChordCaptionInDB(editingChordId, dbFields, userId, setIsLoading, setError)

        if (updatedChord) {
          // Update chords and re-sort by start time + creation time
          const updatedChords = chords.map(chord =>
            chord.id === editingChordId
              ? updatedChord
              : chord
          )

          // Sort the updated chords by start time + creation time
          const sortedChords = sortChordsByTime(updatedChords)
          setChords(sortedChords)

          // Notify parent component
          if (onChordsUpdated) {
            onChordsUpdated(sortedChords)
          }

          setEditingChordId(null)
          setEditingChord({ chord_name: '', start_time: '', end_time: '', fret_position: 'Open' })
          setShowEditModal(false)

          console.log('✅ Chord updated successfully and list re-sorted')

          // Check if chord is in a group and offer to sync group times
          await handleIndividualChordGroupSync(updatedChord)
        }
        // Error handling is done by the utility function
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
    setEditingChord({ chord_name: '', start_time: '', end_time: '', serial_number: null, fret_position: 'Open' })
    setEditingChordUI({ rootNote: 'C', modifier: '' })
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
    setEditingChord({ chord_name: '', start_time: '', end_time: '', fret_position: 'Open' })
    setEditingChordUI({ rootNote: 'C', modifier: '' })
    setOriginalChordSnapshot(null)
    setShowEditModal(false)
  }
  
  /**
   * Duplicate a chord
   */
  const handleDuplicateChord = async (chord) => {
    try {
      console.log('🎸 DUPLICATE CHORD - Original chord:', chord)
      console.log('🎸 DUPLICATE CHORD - All chord keys:', Object.keys(chord))
      console.log('🎸 DUPLICATE CHORD - Group info:', {
        chord_group_id: chord.chord_group_id,
        chord_group_name: chord.chord_group_name,
        fret_position: chord.fret_position
      })
      console.log('🎸 DUPLICATE CHORD - Position field check:', {
        'chord.fret_position': chord.fret_position,
        'chord.position': chord.position,
        'chord.Position': chord.Position,
        'chord.fret_pos': chord.fret_pos
      })

      setIsLoading(true)
      setError(null)
      
      // Create the duplicated chord data
      const chordData = {
        chord_name: chord.chord_name,
        start_time: chord.start_time, // Use original chord's start time
        end_time: calculateEndTime(chord.start_time, chord.end_time), // Calculate proper end time
        chord_data: chord.chord_data || null,
        // NEW: Include group information in duplicate
        chord_group_id: chord.chord_group_id || null,
        chord_group_name: chord.chord_group_name || null,
        // NEW: Include fret position in duplicate
        fret_position: chord.fret_position || null
      }

      console.log('🎸 DUPLICATE CHORD - Prepared chordData:', chordData)

      // For testing: add to local state with mock ID
      if (videoId.includes('test-')) {
        const duplicatedChord = {
          ...chord,
          id: `duplicate-${Date.now()}`,
          start_time: chordData.start_time,
          end_time: chordData.end_time,
          display_order: chords.length + 1,
          created_at: new Date().toISOString(), // Add creation time for sorting
          // NEW: Ensure group fields are included in mock mode
          chord_group_id: chord.chord_group_id || null,
          chord_group_name: chord.chord_group_name || null,
          fret_position: chord.fret_position || null
        }

        // Add duplicate chord and sort by start time + creation time
        const updatedChords = sortChordsByTime([...chords, duplicatedChord])
        setChords(updatedChords)

        // Notify parent component with sorted chords
        if (onChordsUpdated) {
          onChordsUpdated(updatedChords)
        }

        setError('✅ Chord duplicated successfully! (Mock mode)')
        setTimeout(() => setError(null), 3000)
        
      } else {
        // Real database call using centralized utility function
        if (!userId) {
          setError('User ID is required to duplicate chord captions')
          return
        }

        // Use existing specialized utility function instead of direct supabase calls
        const duplicatedChord = await createChordCaptionInDB(chordData, videoId, userId, setIsLoading, setError)

        if (duplicatedChord) {
          // Add the new chord and re-sort by start time + creation time
          const updatedChords = [...chords, duplicatedChord]
          const sortedChords = sortChordsByTime(updatedChords)
          setChords(sortedChords)

          // Notify parent component with sorted chords
          if (onChordsUpdated) {
            onChordsUpdated(sortedChords)
          }

          console.log('✅ Chord duplicated successfully and list re-sorted:', duplicatedChord)
        }
        // Error handling is done by the utility function
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
        const result = await deleteChordCaptionFromDB(chordId, userId, setIsLoading, setError)

        if (result) {
          setChords(prev => prev.filter(chord => chord.id !== chordId))

          // Notify parent component
          if (onChordsUpdated) {
            onChordsUpdated(chords.filter(chord => chord.id !== chordId))
          }

          console.log('✅ Chord deleted successfully')
        } else {
          setError('Failed to delete chord caption')
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
        // Use existing specialized utility function instead of direct supabase calls
        const success = await deleteAllChordCaptionsFromDB(videoId, userId, setIsLoading, setError)

        if (success) {
          // Clear local state after successful database deletion
          setChords([])

          // Notify parent component
          if (onChordsUpdated) {
            onChordsUpdated([])
          }

          setError('✅ Successfully deleted all chord captions!')
          setTimeout(() => setError(null), 3000)
        }
        // Error handling is done by the utility function
      } catch (error) {
        console.error('❌ Error in handleDeleteAllChords:', error)
        setError(`❌ Failed to delete: ${error.message}`)
        setTimeout(() => setError(null), 5000)
      }
    }
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
  
  /**
   * Delete all chord captions and restore from blob (like text-captions)
   */
  const deleteAllAndRestoreFromBlob = async (favoriteId, blobData) => {
    try {
      console.log('🗑️ DELETING ALL CHORDS FROM DATABASE...')
      console.log('🗑️ BLOB RESTORE - favoriteId:', favoriteId)
      console.log('🗑️ BLOB RESTORE - blobData type:', typeof blobData)
      console.log('🗑️ BLOB RESTORE - blobData length:', blobData?.length)
      console.log('🗑️ BLOB RESTORE - blobData is array:', Array.isArray(blobData))

      // Step 1: Delete all existing chord captions
      const { error: deleteError } = await supabase
        .from('chord_captions')
        .delete()
        .eq('favorite_id', favoriteId)

      if (deleteError) {
        console.error('❌ Error deleting all chords:', deleteError)
        throw deleteError
      }

      console.log('✅ All chords deleted from database')

      // Step 2: Restore all chords from blob
      if (blobData && blobData.length > 0) {
        console.log('📦 RESTORING', blobData.length, 'CHORDS FROM BLOB...')
        console.log('📦 BLOB RESTORE - First chord sample:', blobData[0])

        // Prepare chord data for insertion (remove id, created_at, updated_at)
        const chordsToInsert = blobData.map(chord => ({
          favorite_id: favoriteId,
          user_id: chord.user_id,
          chord_name: chord.chord_name,
          start_time: chord.start_time,
          end_time: chord.end_time,
          display_order: chord.display_order,
          serial_number: chord.serial_number,
          chord_data: chord.chord_data,
          // NEW SCHEMA: Removed is_master field (no longer exists in database)
          // NEW SCHEMA: Use chord_group_id and chord_group_name instead of sync_group_id
          chord_group_id: chord.chord_group_id,
          chord_group_name: chord.chord_group_name,
          // NEW FIELD: Include fret position information
          fret_position: chord.fret_position
        }))

        const { error: insertError } = await supabase
          .from('chord_captions')
          .insert(chordsToInsert)

        if (insertError) {
          console.error('❌ Error restoring chords:', insertError)

          // If it's a foreign key constraint error, try again with cleared group references
          if (insertError.message && insertError.message.includes('foreign key constraint')) {
            console.log('🔧 Foreign key constraint detected - clearing group references and retrying...')

            const chordsWithoutGroups = chordsToInsert.map(chord => ({
              ...chord,
              chord_group_id: null,
              chord_group_name: null
            }))

            const { error: retryError } = await supabase
              .from('chord_captions')
              .insert(chordsWithoutGroups)

            if (retryError) {
              console.error('❌ Error on retry without groups:', retryError)
              throw retryError
            }

            console.log('✅ Chords restored successfully (group references cleared due to deleted groups)')
          } else {
            throw insertError
          }
        } else {
          console.log('✅ All chords restored from blob')
        }
      } else {
        console.log('📦 No chords to restore (empty blob)')
      }

      return { success: true }
    } catch (error) {
      console.error('❌ Failed to delete all and restore:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle Add Group button click (now integrated into Group Management Modal)
   */
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Please enter a group name')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Get the favorite_id for this video+user combination
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (favoriteError) {
        console.error('❌ Error finding favorite:', favoriteError)
        setError('Failed to find video favorite')
        return
      }

      // Create the new group
      const { data, error } = await supabase
        .from('chord_groups')
        .insert({
          favorite_id: favoriteData.id,
          user_id: userId,
          group_name: newGroupName.trim(),
          group_color: '#FFB3BA' // Default color
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating group:', error)
        setError('Failed to create group')
        return
      }

      console.log('✅ Group created successfully:', data)

      // Update available groups list
      setAvailableGroups(prev => [...prev, data])

      // Clear the input
      setNewGroupName('')

      console.log('✅ Group added to available groups list')

    } catch (error) {
      console.error('❌ Error in handleAddGroup:', error)
      setError('Failed to create group')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle Add Group dialog - Create new group
   */
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Please enter a group name')
      return
    }

    try {
      console.log('🎸 Creating new chord group:', newGroupName)

      // NEW SCHEMA: Create group in chord_groups table (renamed from chord_sync_chords)
      // Step 1: Get the favorite_id for this video+user combination
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (favoriteError) {
        setError('Video must be favorited to create chord groups')
        return
      }

      // Step 2: Create new group record with proper foreign keys
      const { data: newGroup, error: groupError } = await supabase
        .from('chord_groups')
        .insert({
          group_name: newGroupName.trim(),        // NEW SCHEMA: renamed from chord_name
          favorite_id: favoriteData.id,           // Links group to specific video
          user_id: userId,                        // Links group to specific user
          group_color: '#3B82F6'                  // Default blue color for visual grouping
        })
        .select()
        .single()

      if (groupError) {
        console.error('❌ Error creating group:', groupError)
        setError('Failed to create group')
        return
      }

      // Step 3: Add to available groups for immediate use in dropdown
      setAvailableGroups(prev => [...prev, newGroup])

      setError(`✅ Group "${newGroupName}" created successfully!`)
      setTimeout(() => setError(null), 3000)

      // Close dialog and reset
      setShowAddGroupDialog(false)
      setNewGroupName('')

    } catch (error) {
      console.error('❌ Error creating group:', error)
      setError('Failed to create group')
    }
  }

  /**
   * Handle Add Group dialog - Cancel
   */
  const handleCancelAddGroup = () => {
    setShowAddGroupDialog(false)
    setNewGroupName('')
  }

  /**
   * Load available groups for dropdowns
   */
  const loadAvailableGroups = async () => {
    try {
      console.log('🎸 Loading available chord groups...')

      // NEW SCHEMA: Load groups from chord_groups table (renamed from chord_sync_chords)
      // Step 1: Get the favorite_id for this video+user combination
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (favoriteError) {
        console.log('⚠️ Video not favorited - no groups to load')
        setAvailableGroups([])
        return
      }

      // Step 2: Load all groups for this specific video+user
      const { data: groups, error: groupsError } = await supabase
        .from('chord_groups')
        .select('*')                              // Get all fields including group_color
        .eq('favorite_id', favoriteData.id)      // Filter by video
        .eq('user_id', userId)                    // Filter by user
        .order('group_name')                      // Sort alphabetically

      if (groupsError) {
        console.error('❌ Error loading groups:', groupsError)
        setAvailableGroups([])
        return
      }

      // Step 3: Update state with loaded groups for dropdown population
      setAvailableGroups(groups || [])
      console.log('✅ Loaded', groups?.length || 0, 'chord groups')

    } catch (error) {
      console.error('❌ Error loading groups:', error)
      setAvailableGroups([])
    }
  }

  /**
   * Handle Manage Groups modal - Open
   */
  const handleOpenManageGroups = async () => {
    // Refresh groups before opening modal
    await loadAvailableGroups()
    setShowManageGroupsModal(true)
  }

  /**
   * Handle individual chord group time sync with confirmation
   */
  const handleIndividualChordGroupSync = async (chordData) => {
    if (!chordData.chord_group_name) return // No group, no sync needed

    const shouldSync = window.confirm(
      `Use this Chord-Caption In/Out times for all records in "${chordData.chord_group_name}" Group?`
    )

    if (!shouldSync) return // User declined sync

    try {
      console.log(`🔄 Syncing group "${chordData.chord_group_name}" to times ${chordData.start_time} - ${chordData.end_time}`)

      // Update all chords in the same group to match this chord's timing
      const { error } = await supabase
        .from('chord_captions')
        .update({
          start_time: chordData.start_time,
          end_time: chordData.end_time,
          updated_at: new Date().toISOString()
        })
        .eq('chord_group_name', chordData.chord_group_name)
        .eq('user_id', userId)
        .neq('id', chordData.id) // Don't update the chord we just saved

      if (error) {
        console.error(`❌ Error syncing group "${chordData.chord_group_name}":`, error)
        throw error
      }

      // Update local state to reflect the changes
      setChords(prev => prev.map(chord => {
        if (chord.chord_group_name === chordData.chord_group_name && chord.id !== chordData.id) {
          return {
            ...chord,
            start_time: chordData.start_time,
            end_time: chordData.end_time
          }
        }
        return chord
      }))

      console.log(`✅ Group "${chordData.chord_group_name}" synchronized successfully`)

    } catch (error) {
      console.error('❌ Error during individual chord group sync:', error)
      setError(`Failed to sync group "${chordData.chord_group_name}"`)
    }
  }

  /**
   * Handle group time synchronization (for SAVE button in header)
   */
  const handleGroupTimeSync = async () => {
    try {
      console.log('🔄 Starting group time synchronization...')

      // Group chords by their group names
      const groupedChords = {}
      chords.forEach(chord => {
        if (chord.chord_group_name) {
          if (!groupedChords[chord.chord_group_name]) {
            groupedChords[chord.chord_group_name] = []
          }
          groupedChords[chord.chord_group_name].push(chord)
        }
      })

      // For each group, find the first chord by start time and sync others to it
      for (const [groupName, groupChords] of Object.entries(groupedChords)) {
        if (groupChords.length <= 1) continue // Skip groups with only one chord

        // Sort by start time to find the first chord
        const sortedChords = groupChords.sort((a, b) => {
          const aStart = parseTimeToSeconds(a.start_time)
          const bStart = parseTimeToSeconds(b.start_time)
          return aStart - bStart
        })

        const masterChord = sortedChords[0]
        const slavesChords = sortedChords.slice(1)

        console.log(`🎯 Syncing group "${groupName}": ${slavesChords.length} chords to master chord at ${masterChord.start_time}`)

        // Update all slave chords to match master's timing
        for (const slaveChord of slavesChords) {
          const { error } = await supabase
            .from('chord_captions')
            .update({
              start_time: masterChord.start_time,
              end_time: masterChord.end_time,
              updated_at: new Date().toISOString()
            })
            .eq('id', slaveChord.id)
            .eq('user_id', userId)

          if (error) {
            console.error(`❌ Error syncing chord ${slaveChord.id}:`, error)
            throw error
          }
        }

        // Update local state to reflect the changes
        setChords(prev => prev.map(chord => {
          if (chord.chord_group_name === groupName && chord.id !== masterChord.id) {
            return {
              ...chord,
              start_time: masterChord.start_time,
              end_time: masterChord.end_time
            }
          }
          return chord
        }))

        console.log(`✅ Group "${groupName}" synchronized successfully`)
      }

      console.log('✅ All group time synchronization completed')

    } catch (error) {
      console.error('❌ Error during group time sync:', error)
      throw error
    }
  }

  /**
   * Handle Delete Group
   */
  const handleDeleteGroup = async () => {
    if (!selectedGroupToDelete) {
      setError('Please select a group to delete')
      return
    }

    try {
      console.log('🗑️ Deleting chord group:', selectedGroupToDelete)

      // NEW SCHEMA: Delete from chord_groups table and clear group fields from chord_captions
      const groupToDelete = availableGroups.find(g => g.id === selectedGroupToDelete)

      // Step 1: Clear the group from any chord captions that use it
      // NEW SCHEMA: Clear both chord_group_id and chord_group_name fields
      const { error: clearError } = await supabase
        .from('chord_captions')
        .update({
          chord_group_id: null,                   // NEW SCHEMA: renamed from sync_group_id
          chord_group_name: null                  // NEW SCHEMA: clear display name too
        })
        .eq('chord_group_id', selectedGroupToDelete)

      if (clearError) {
        console.error('❌ Error clearing group from chord captions:', clearError)
        setError('Failed to clear group from chord captions')
        return
      }

      // Step 2: Delete the group itself from chord_groups table
      const { error: deleteError } = await supabase
        .from('chord_groups')                     // NEW SCHEMA: renamed from chord_sync_chords
        .delete()
        .eq('id', selectedGroupToDelete)          // NEW SCHEMA: use id instead of sync_group_id

      if (deleteError) {
        console.error('❌ Error deleting group:', deleteError)
        setError('Failed to delete group')
        return
      }

      // Step 3: Update local chord state to remove group assignments immediately
      const updatedChords = chords.map(chord =>
        chord.chord_group_id === selectedGroupToDelete
          ? { ...chord, chord_group_id: null, chord_group_name: null }
          : chord
      )
      setChords(updatedChords)

      // Step 4: Update the blob snapshot to reflect the group deletion
      // This ensures CANCEL operations work correctly after group deletion
      console.log('📦 Updating blob snapshot after group deletion...')
      setOriginalChordsBlob(JSON.parse(JSON.stringify(updatedChords)))

      setError(`✅ Group "${groupToDelete?.group_name}" deleted successfully!`)
      setTimeout(() => setError(null), 3000)

      // Remove from local state
      setAvailableGroups(prev => prev.filter(g => g.id !== selectedGroupToDelete))
      setSelectedGroupToDelete('')

    } catch (error) {
      console.error('❌ Error deleting group:', error)
      setError('Failed to delete group')
    }
  }

  /**
   * Handle Manage Groups modal - Close
   */
  const handleCloseManageGroups = () => {
    setShowManageGroupsModal(false)
    setSelectedGroupToDelete('')
  }

  /**
   * Smart cancel with change detection (like text-captions)
   */
  const handleSmartCancel = async () => {
    console.log('🎸 Smart cancel initiated...')
    console.log('🎸 SMART CANCEL - originalChordsBlob type:', typeof originalChordsBlob)
    console.log('🎸 SMART CANCEL - originalChordsBlob length:', originalChordsBlob?.length)
    console.log('🎸 SMART CANCEL - chords length:', chords?.length)

    if (!originalChordsBlob) {
      console.log('⚠️ No original blob found - closing modal without changes')
      setShowChordModal(false)
      return
    }

    // Compare current chords with original blob
    const hasChanges = JSON.stringify(originalChordsBlob) !== JSON.stringify(chords)
    console.log('🔍 Changes detected:', hasChanges)
    console.log('🔍 SMART CANCEL - originalChordsBlob sample:', originalChordsBlob?.slice(0, 2))
    console.log('🔍 SMART CANCEL - chords sample:', chords?.slice(0, 2))

    if (hasChanges) {
      console.log('⚠️ Changes detected - showing confirmation dialog')
      const confirmed = window.confirm('Click OK to Cancel & Revert all changes. Click Cancel to continue editing.')

      if (confirmed) {
        console.log('✅ User confirmed cancel - reverting changes')

        // Get favorite ID for database operations
        const { data: favoriteData, error: favoriteError } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .single()

        if (favoriteError) {
          console.error('❌ Error getting favorite ID:', favoriteError)
          setError('Failed to revert changes - could not find video favorite')
          return
        }

        // Delete all and restore from blob
        console.log('🎸 SMART CANCEL - Calling deleteAllAndRestoreFromBlob with:', {
          favoriteId: favoriteData.id,
          blobType: typeof originalChordsBlob,
          blobLength: originalChordsBlob?.length,
          blobSample: originalChordsBlob?.slice(0, 1)
        })
        const restoreResult = await deleteAllAndRestoreFromBlob(favoriteData.id, originalChordsBlob)
        console.log('🎸 SMART CANCEL - deleteAllAndRestoreFromBlob result:', restoreResult)

        if (!restoreResult.success) {
          console.error('❌ Failed to restore from blob:', restoreResult.error)
          setError('Failed to revert changes - database restore failed')
          return
        }

        // Update local state to blob
        setChords(JSON.parse(JSON.stringify(originalChordsBlob)))

        // Notify parent component
        if (onChordsUpdated) {
          onChordsUpdated(JSON.parse(JSON.stringify(originalChordsBlob)))
        }

        // Clear blob and close modal
        setOriginalChordsBlob(null)
        setShowChordModal(false)

        console.log('🔄 Changes reverted and modal closed - SIMPLE BLOB RESTORE COMPLETE')
      } else {
        console.log('📝 User chose to keep editing - staying in modal')
      }
    } else {
      console.log('✅ No changes detected - closing modal silently')
      setOriginalChordsBlob(null)
      setShowChordModal(false)
    }
  }

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
                      serial_number: null, // null indicates ADD mode
                      fret_position: 'Open' // Default position
                    })

                    // Set UI state for chord selection with default "C" root note
                    setEditingChordUI({
                      rootNote: 'C',
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



                {/* Delete All Button */}
                <button
                  onClick={handleDeleteAllChords}
                  className="bg-transparent border-2 border-red-500 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm"
                  title="Delete all chord captions"
                >
                  <PiTrashBold className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>All</span>
                </button>
              </div>

              {/* Right side - Cancel and Save buttons - aligned with title */}
              <div className="flex items-center space-x-1 sm:space-x-2 mr-0">
                {/* Cancel Button - Smart cancel like text-captions */}
                <button
                  onClick={handleSmartCancel}
                  className="bg-transparent border-2 border-gray-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm"
                  title="Cancel changes (smart detection)"
                >
                  <PiXCircleFill className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Cancel</span>
                </button>

                {/* Save Button */}
                <button
                  onClick={async () => {
                    try {
                      // Perform group time synchronization before closing
                      await handleGroupTimeSync()

                      // Clear blob when saving (changes are committed)
                      setOriginalChordsBlob(null)
                      setShowChordModal(false)
                      console.log('💾 Chord modal saved and closed - blob cleared')
                    } catch (error) {
                      console.error('❌ Error during save:', error)
                      setError('Failed to sync group times')
                    }
                  }}
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
                  return `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')} / ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`
                })()}</span>
                <span className="text-gray-400 text-xs sm:text-sm font-medium">
                    </span>
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
        {/* SCROLLABLE CONTENT SECTION */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
        
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
            chords.map((chord) => (
              <div 
                key={chord.id} 
                className="border-b border-gray-700 last:border-b-0"
              >

                  <div className="flex items-center justify-between py-2 sm:py-3">
                    <div className="flex-1">
                      <span className="text-sm sm:text-lg font-bold text-white">
                        {chord.chord_name}
                        {chord.fret_position && chord.fret_position !== 'Open' && (
                          <span className="text-sm text-white ml-1">{chord.fret_position}</span>
                        )}
                      </span>
                    </div>

                    {/* Chord Name Dropdown - Left of Time Fields */}
                    <div className="flex-1 text-left mr-4">
                      <select
                        value={chord.chord_group_name || ''}
                        onChange={async (e) => {
                          console.log('🎸 GROUP DROPDOWN - chord.chord_group_name:', `"${chord.chord_group_name}"`, 'type:', typeof chord.chord_group_name)
                          if (e.target.value === 'manage_groups') {
                            handleOpenManageGroups()
                          } else {
                            // NEW SCHEMA: Update chord_group_name field and save to database immediately
                            const selectedGroupName = e.target.value || null
                            const selectedGroup = availableGroups.find(g => g.group_name === selectedGroupName)

                            try {
                              // Update database immediately
                              const { error } = await supabase
                                .from('chord_captions')
                                .update({
                                  chord_group_id: selectedGroup?.id || null,
                                  chord_group_name: selectedGroupName
                                })
                                .eq('id', chord.id)
                                .eq('user_id', userId)

                              if (error) {
                                console.error('❌ Error updating chord group:', error)
                                setError('Failed to assign chord to group')
                                return
                              }

                              // Update local state for immediate UI feedback
                              setChords(prev => prev.map(c =>
                                c.id === chord.id
                                  ? { ...c, chord_group_id: selectedGroup?.id || null, chord_group_name: selectedGroupName }
                                  : c
                              ))

                              console.log('✅ Chord group assignment saved successfully')

                            } catch (error) {
                              console.error('❌ Error assigning chord to group:', error)
                              setError('Failed to assign chord to group')
                            }
                          }
                        }}
                        className={`w-full max-w-[120px] px-2 py-1 bg-transparent border border-white/20 rounded text-xs sm:text-sm focus:border-blue-400 focus:outline-none ${
                          (() => {
                            const hasGroup = chord.chord_group_name && chord.chord_group_name.trim() !== '';
                            console.log('🎨 GROUP COLOR - chord:', chord.chord_name, 'group_name:', `"${chord.chord_group_name}"`, 'hasGroup:', hasGroup, 'color:', hasGroup ? 'white' : 'gray');
                            return hasGroup ? 'text-white' : 'text-gray-400';
                          })()
                        }`}
                        title="Select chord group"
                      >
                        <option value="" className="bg-gray-800">No Group</option>
                        {/* NEW SCHEMA: Populate dropdown from chord_groups table */}
                        {availableGroups.map((group) => (
                          <option
                            key={group.id}                   // NEW SCHEMA: use id as key
                            value={group.group_name}         // NEW SCHEMA: use group_name as value
                            className="bg-gray-800"
                            style={{ color: group.group_color }}  // NEW SCHEMA: apply group_color for visual grouping
                          >
                            {group.group_name}               {/* NEW SCHEMA: display group_name */}
                          </option>
                        ))}
                        <option disabled className="bg-gray-700">────────</option>
                        <option value="manage_groups" className="bg-gray-800">Manage Groups</option>
                      </select>
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
              <div className="text-left ml-5 mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {editingChord?.serial_number ? `Chord Caption #${editingChord.serial_number}` : 'Add Chord Caption'}
                </h3>
              </div>
            
              {/* Edit Form */}
              <div className="space-y-3 sm:space-y-4">
                {/* Chord Selection */}
                <div className="text-left ml-5">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm sm:text-base font-bold text-gray-400">Chord:</label>
                    <select
                      value={editingChordUI.rootNote || ''}
                      onChange={(e) => {
                        const rootNote = e.target.value
                        const modifier = editingChordUI.modifier || ''
                        const chordName = buildChordName(rootNote, modifier)
                        setEditingChordUI(prev => ({ ...prev, rootNote }))
                        setEditingChord(prev => ({ ...prev, chord_name: chordName }))
                      }}
                      className="w-20 sm:w-24 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border border-white/20 rounded text-white text-sm sm:text-base focus:border-blue-400 focus:outline-none"
                    >
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
                      className="w-28 sm:w-32 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border border-white/20 rounded text-white text-sm sm:text-base focus:border-blue-400 focus:outline-none"
                    >
                      <option value="" className="bg-gray-800">Major</option>
                      {CHORD_MODIFIERS.filter(m => m.value !== '').map(mod => (
                        <option key={mod.value} value={mod.value} className="bg-gray-800">
                          {mod.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={editingChord.fret_position || 'Open'}
                      onChange={(e) => setEditingChord(prev => ({ ...prev, fret_position: e.target.value }))}
                      className="w-[72px] sm:w-28 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border border-white/20 rounded text-white text-sm sm:text-base focus:border-blue-400 focus:outline-none"
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

                {/* Group Selection */}
                <div className="text-left ml-5">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm sm:text-base font-bold text-gray-400">Group:</label>
                    <select
                      value={editingChord.chord_group_name || ''}
                      onChange={(e) => {
                        if (e.target.value === 'manage_groups') {
                          handleOpenManageGroups()
                        } else {
                          setEditingChord(prev => ({
                            ...prev,
                            chord_group_name: e.target.value || null,
                            chord_group_id: availableGroups.find(g => g.group_name === e.target.value)?.id || null
                          }))
                        }
                      }}
                      className="px-2 py-1 sm:px-3 sm:py-2 bg-transparent border rounded text-white text-sm sm:text-base focus:outline-none border-white/20 focus:border-blue-400"
                    >
                      <option value="" className="bg-gray-800 text-white">No Group</option>
                      {availableGroups.map(group => (
                        <option key={group.id} value={group.group_name} className="bg-gray-800 text-white">
                          {group.group_name}
                        </option>
                      ))}
                      <option value="manage_groups" className="bg-gray-800 text-yellow-400">+ Manage Groups</option>
                    </select>
                  </div>
                </div>

                {/* Time Inputs */}
                <div className="flex justify-start ml-5 space-x-4 sm:space-x-6">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm sm:text-base font-medium text-gray-400">In:</label>
                    <input
                      type="text"
                      value={editingChord.start_time}
                      onChange={(e) => setEditingChord(prev => ({ ...prev, start_time: e.target.value }))}
                      placeholder="1:30"
                      className="w-16 sm:w-20 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border rounded text-blue-400 text-sm sm:text-base focus:outline-none border-white/20 focus:border-blue-400"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm sm:text-base font-medium text-gray-400">Out:</label>
                    <input
                      type="text"
                      value={editingChord.end_time}
                      onChange={(e) => setEditingChord(prev => ({ ...prev, end_time: e.target.value }))}
                      placeholder="2:00"
                      className="w-16 sm:w-20 px-2 py-1 sm:px-3 sm:py-2 bg-transparent border rounded text-blue-400 text-sm sm:text-base focus:outline-none border-white/20 focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-start ml-5 space-x-1 sm:space-x-2 pt-2 sm:pt-4">
                  <button
                    onClick={editingChord?.serial_number ? handleCancelEditChord : handleCancelAddChord}
                    disabled={isLoading}
                    className="bg-transparent border-2 border-gray-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-sm sm:text-base disabled:opacity-50"
                  >
                    <PiXCircleFill className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Cancel</span>
                  </button>

                  <button
                    onClick={editingChord?.serial_number ? handleSaveEditedChord : handleSaveNewChord}
                    disabled={isLoading}
                    className={`bg-transparent border-2 ${editingChord?.serial_number ? 'border-blue-600' : 'border-green-600'} text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <PiCloudArrowDownFill className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{isLoading ? 'Saving...' : (editingChord?.serial_number ? 'Save' : 'Add Chord')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Group Dialog */}
      {showAddGroupDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white border-2 border-white/80">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Add New Chord Group</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Group Name:</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-3 py-2 bg-transparent border border-white/20 rounded text-white focus:border-blue-400 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateGroup()
                    }
                  }}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelAddGroup}
                  className="bg-transparent border-2 border-gray-600 text-white hover:bg-gray-900 rounded-[33px] px-4 py-2 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="bg-transparent border-2 border-green-600 text-white hover:bg-gray-900 rounded-[33px] px-4 py-2 transition-all duration-200"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Groups Modal */}
      {showManageGroupsModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              handleCloseManageGroups()
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div
            className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white border-2 border-white/80"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header with title and close button */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Manage Chord Groups</h3>
                <button
                  onClick={handleCloseManageGroups}
                  className="bg-transparent border-2 border-gray-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm"
                  title="Close and return to chord editor"
                >
                  <span>DONE</span>
                </button>
              </div>

              {/* Add New Group Section */}
              <div className="mb-6 p-4 border border-white/20 rounded-lg">
                <h4 className="text-sm font-medium mb-3">Add New Group:</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="flex-1 px-3 py-2 bg-transparent border border-white/20 rounded text-white focus:border-blue-400 focus:outline-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newGroupName.trim()) {
                        handleAddGroup()
                      }
                    }}
                  />
                  <button
                    onClick={handleAddGroup}
                    disabled={!newGroupName.trim()}
                    className="bg-transparent border-2 border-green-600 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add new chord group"
                  >
                    <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Delete Group Section */}
              <div className="mb-4 p-4 border border-white/20 rounded-lg">
                <h4 className="text-sm font-medium mb-3">Select Group to Delete:</h4>
                <div className="flex space-x-2">
                  <select
                    value={selectedGroupToDelete}
                    onChange={(e) => setSelectedGroupToDelete(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent border border-white/20 rounded text-white focus:border-blue-400 focus:outline-none text-sm"
                  >
                    <option value="" className="bg-gray-800">Select a group...</option>
                    {/* NEW SCHEMA: Populate delete dropdown from chord_groups table */}
                    {availableGroups.map((group) => (
                      <option key={group.id} value={group.id} className="bg-gray-800">
                        {group.group_name}                     {/* NEW SCHEMA: display group_name */}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleDeleteGroup}
                    disabled={!selectedGroupToDelete}
                    className="bg-transparent border-2 border-red-500 text-white hover:bg-gray-900 rounded-[33px] px-2 py-1 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-2 transition-all duration-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete selected group"
                  >
                    <PiTrashBold className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Delete</span>
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
