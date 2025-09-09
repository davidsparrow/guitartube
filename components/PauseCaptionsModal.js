import React, { useState, useEffect } from 'react'
import { FaPlus, FaTimes, FaTrash } from 'react-icons/fa'

const PauseCaptionsModal = ({
  isOpen,
  onClose,
  videoId,
  userId,
  player,
  currentTime
}) => {
  const [pauseCaptions, setPauseCaptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load pause captions when modal opens
  useEffect(() => {
    if (isOpen && videoId && userId) {
      loadPauseCaptions()
    }
  }, [isOpen, videoId, userId])

  // Load pause captions from database
  const loadPauseCaptions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { supabase } = await import('../lib/supabase')
      
      // Get favorite_id first
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (favoriteError) {
        console.log('No favorite found, no pause captions to load')
        setPauseCaptions([])
        return
      }

      // Load pause-scroll captions (row_type = 3)
      const { data, error } = await supabase
        .from('captions')
        .select('*')
        .eq('favorite_id', favoriteData.id)
        .eq('row_type', 3)
        .order('start_time')

      if (error) throw error

      // Convert database format to component format
      const formattedCaptions = data.map(caption => ({
        id: caption.id,
        startTime: caption.start_time,
        endTime: caption.end_time,
        description: caption.line1 || 'Pause segment'
      }))

      setPauseCaptions(formattedCaptions)
      console.log('📋 Loaded pause captions:', formattedCaptions.length)
    } catch (error) {
      console.error('❌ Error loading pause captions:', error)
      setError('Failed to load pause captions')
    } finally {
      setIsLoading(false)
    }
  }

  // Add new pause caption
  const addPauseCaption = () => {
    const currentVideoTime = player?.getCurrentTime ? Math.floor(player.getCurrentTime()) : 0
    const startMinutes = Math.floor(currentVideoTime / 60)
    const startSeconds = currentVideoTime % 60
    const startTime = `${startMinutes}:${startSeconds.toString().padStart(2, '0')}`
    
    // Default 5-second pause
    const endVideoTime = currentVideoTime + 5
    const endMinutes = Math.floor(endVideoTime / 60)
    const endSecondsValue = endVideoTime % 60
    const endTime = `${endMinutes}:${endSecondsValue.toString().padStart(2, '0')}`

    const newCaption = {
      id: `temp-${Date.now()}`,
      startTime,
      endTime,
      description: 'Pause segment'
    }

    setPauseCaptions(prev => [...prev, newCaption].sort((a, b) => {
      const aSeconds = parseTimeToSeconds(a.startTime)
      const bSeconds = parseTimeToSeconds(b.startTime)
      return aSeconds - bSeconds
    }))
  }

  // Delete pause caption
  const deletePauseCaption = async (captionId) => {
    if (captionId.startsWith('temp-')) {
      // Remove temporary caption
      setPauseCaptions(prev => prev.filter(c => c.id !== captionId))
      return
    }

    try {
      const { supabase } = await import('../lib/supabase')
      
      const { error } = await supabase
        .from('captions')
        .delete()
        .eq('id', captionId)
        .eq('user_id', userId)

      if (error) throw error

      setPauseCaptions(prev => prev.filter(c => c.id !== captionId))
      console.log('🗑️ Deleted pause caption:', captionId)
    } catch (error) {
      console.error('❌ Error deleting pause caption:', error)
      setError('Failed to delete pause caption')
    }
  }

  // Update pause caption field
  const updatePauseCaption = (captionId, field, value) => {
    setPauseCaptions(prev => prev.map(caption => 
      caption.id === captionId 
        ? { ...caption, [field]: value }
        : caption
    ))
  }

  // Save all pause captions
  const savePauseCaptions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { supabase } = await import('../lib/supabase')
      
      // Get favorite_id
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (favoriteError) throw favoriteError

      // Process each caption
      for (const caption of pauseCaptions) {
        if (caption.id.startsWith('temp-')) {
          // Create new caption (row_type = 3 for pause-scroll)
          const { error: insertError } = await supabase
            .from('captions')
            .insert({
              favorite_id: favoriteData.id,
              user_id: userId,
              row_type: 3,
              start_time: caption.startTime,
              end_time: caption.endTime,
              line1: caption.description,
              line2: '',
              serial_number: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) throw insertError
        } else {
          // Update existing caption
          const { error: updateError } = await supabase
            .from('captions')
            .update({
              start_time: caption.startTime,
              end_time: caption.endTime,
              line1: caption.description,
              line2: '',
              updated_at: new Date().toISOString()
            })
            .eq('id', caption.id)
            .eq('user_id', userId)

          if (updateError) throw updateError
        }
      }

      console.log('💾 Saved all pause captions')
      onClose() // Close modal after successful save
    } catch (error) {
      console.error('❌ Error saving pause captions:', error)
      setError('Failed to save pause captions')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to parse time strings to seconds
  const parseTimeToSeconds = (timeString) => {
    if (!timeString) return 0
    const parts = timeString.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black rounded-2xl shadow-2xl max-w-2xl w-full relative text-white border-2 border-white/80 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/20">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">⏸️ Pause Captions</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Create pause segments that stop scrolling while video continues playing
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Add Button */}
          <div className="mb-4">
            <button
              onClick={addPauseCaption}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <FaPlus size={14} />
              Add Pause Segment
            </button>
          </div>

          {/* Pause Captions List */}
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading pause captions...</p>
            </div>
          ) : pauseCaptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No pause segments yet. Click "Add Pause Segment" to create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pauseCaptions.map((caption, index) => (
                <div key={caption.id} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    {/* Serial Number */}
                    <div className="w-8 text-center">
                      <span className="text-sm font-bold text-blue-400">
                        {index + 1}
                      </span>
                    </div>

                    {/* Time Inputs */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={caption.startTime}
                        onChange={(e) => updatePauseCaption(caption.id, 'startTime', e.target.value)}
                        className="w-16 px-2 py-1 text-xs bg-transparent text-blue-400 border border-white/20 focus:border-blue-400 focus:outline-none rounded"
                        placeholder="0:00"
                      />
                      <span className="text-gray-400 text-xs">to</span>
                      <input
                        type="text"
                        value={caption.endTime}
                        onChange={(e) => updatePauseCaption(caption.id, 'endTime', e.target.value)}
                        className="w-16 px-2 py-1 text-xs bg-transparent text-blue-400 border border-white/20 focus:border-blue-400 focus:outline-none rounded"
                        placeholder="0:05"
                      />
                    </div>

                    {/* Description */}
                    <input
                      type="text"
                      value={caption.description}
                      onChange={(e) => updatePauseCaption(caption.id, 'description', e.target.value)}
                      className="flex-1 px-3 py-1 text-sm bg-transparent border border-white/20 focus:border-blue-400 focus:outline-none rounded"
                      placeholder="Pause reason (e.g., Guitar Solo, Drum Break)"
                    />

                    {/* Delete Button */}
                    <button
                      onClick={() => deletePauseCaption(caption.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete pause segment"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={savePauseCaptions}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PauseCaptionsModal
