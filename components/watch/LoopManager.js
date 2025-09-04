// components/watch/LoopManager.js - Loop Management Hook
import { useEffect } from 'react'
import { timeToSeconds } from '../../utils/captionUtils'
import { isPlayerReady as isPlayerReadyFromUtils } from '../../utils/videoPlayerUtils'

export default function useLoopManager({
  // Player props
  player,

  // Loop state props
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

  // Access control
  checkDailyWatchTimeLimits,
  currentDailyTotal,

  // Unfavorite cleanup
  onUnfavoriteCleanup,

  // Video and user context for persistence
  videoId,
  videoTitle,
  user,

  // Loop manager hook functions
  saveLoopTimes,
  loadLoopTimes,
  deleteLoopTimes,
  validateLoopTimes
}) {
  // Load saved loop times when video changes
  useEffect(() => {
    const loadSavedLoopTimes = async () => {
      if (!videoId || !user?.id || !loadLoopTimes) return

      console.log('📥 Loading saved loop times for video:', videoId)

      try {
        const savedLoop = await loadLoopTimes(videoId, user.id)

        if (savedLoop) {
          console.log('✅ Found saved loop times:', savedLoop)
          setLoopStartTime(savedLoop.startTime)
          setLoopEndTime(savedLoop.endTime)
          setTempLoopStart(savedLoop.startTime)
          setTempLoopEnd(savedLoop.endTime)
          // Don't auto-activate loop, let user decide
        } else {
          console.log('📭 No saved loop times found, using defaults')
          // Reset to defaults
          setLoopStartTime('0:00')
          setLoopEndTime('0:00')
          setTempLoopStart('0:00')
          setTempLoopEnd('0:00')
          setIsLoopActive(false)
        }
      } catch (error) {
        console.error('❌ Error loading saved loop times:', error)
      }
    }

    loadSavedLoopTimes()
  }, [videoId, user?.id, loadLoopTimes, setLoopStartTime, setLoopEndTime, setTempLoopStart, setTempLoopEnd, setIsLoopActive])

  // Loop timing effect - runs when loop is active
  useEffect(() => {
    if (!isLoopActive || !player || !isPlayerReadyFromUtils(player)) return

    console.log('🔄 Starting loop monitoring for:', { loopStartTime, loopEndTime })

    const loopInterval = setInterval(() => {
      try {
        if (player.getCurrentTime && typeof player.getCurrentTime === 'function') {
          const currentTime = player.getCurrentTime()
          const startSeconds = timeToSeconds(loopStartTime)
          const endSeconds = timeToSeconds(loopEndTime)
          
          // Debug: Log current loop status every 5 seconds
          if (Math.floor(currentTime) % 5 === 0) {
            console.log('🔄 Loop check:', { 
              currentTime: currentTime.toFixed(1), 
              startSeconds, 
              endSeconds,
              shouldLoop: currentTime >= endSeconds 
            })
          }
          
          // If we've reached or passed the end time, loop back to start
          if (currentTime >= endSeconds) {
            if (player.seekTo && typeof player.seekTo === 'function') {
              player.seekTo(startSeconds, true)
              console.log('🔄 Looping back to start:', startSeconds)

              // Ensure video continues playing after seek (YouTube sometimes pauses after multiple seeks)
              setTimeout(() => {
                if (player.playVideo) {
                  player.playVideo()
                  console.log('▶️ Resumed playback after loop-back seek')
                }
              }, 100) // Small delay to let seek complete
            }
          }
        }
      } catch (error) {
        console.error('❌ Loop check error:', error)
      }
    }, 1000) // Check every second

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up loop interval')
      clearInterval(loopInterval)
    }
  }, [isLoopActive, loopStartTime, loopEndTime, player])

  // Handle loop button click
  const handleLoopClick = () => {
    console.log('🔄 Loop button clicked, current state:', { isLoopActive })
    
    // Check daily watch time limits before allowing loop feature
    if (!checkDailyWatchTimeLimits(currentDailyTotal, { returnBoolean: true })) {
      console.log('🚫 Loop access blocked - daily limit exceeded')
      return
    }

    // Check if user can access loop functionality
    // This would typically check plan access, favorites, etc.
    // For now, we'll assume access is granted if daily limits pass

    // SMART BEHAVIOR: Check if loop times are configured
    const hasValidLoopTimes = loopStartTime && loopEndTime &&
                             loopStartTime !== '0:00' && loopEndTime !== '0:00' &&
                             loopStartTime !== loopEndTime

    if (!hasValidLoopTimes) {
      // NO VALID TIMES: Open modal editor
      console.log('⚙️ No valid loop times found - opening modal editor')
      setTempLoopStart(loopStartTime)
      setTempLoopEnd(loopEndTime)
      setShowLoopModal(true)
      return
    }

    // VALID TIMES EXIST: Toggle loop start/stop
    if (isLoopActive) {
      // Stop the loop
      setIsLoopActive(false)
      console.log('⏹️ Loop stopped')
    } else {
      // Start the loop
      setIsLoopActive(true)
      console.log('▶️ Loop started with existing times:', { loopStartTime, loopEndTime })
    }
  }

  // Handle loop times display click
  const handleLoopTimesClick = () => {
    console.log('🕐 Loop times clicked')
    
    // Check daily watch time limits before allowing loop feature
    if (!checkDailyWatchTimeLimits(currentDailyTotal, { returnBoolean: true })) {
      console.log('🚫 Loop times access blocked - daily limit exceeded')
      return
    }

    // Check if user can access loop functionality
    // This would typically check plan access, favorites, etc.
    // For now, we'll assume access is granted if daily limits pass

    // Open modal directly when clicking on time display
    setTempLoopStart(loopStartTime)
    setTempLoopEnd(loopEndTime)
    setShowLoopModal(true)
    console.log('⚙️ Opening loop configuration modal from times display')
  }

  // Handle save loop configuration
  const handleSaveLoop = async () => {
    console.log('💾 Saving loop configuration:', { tempLoopStart, tempLoopEnd })

    // Validate loop times using enhanced validation
    if (validateLoopTimes) {
      const videoDuration = player && player.getDuration ? player.getDuration() : null
      const validation = validateLoopTimes(tempLoopStart, tempLoopEnd, videoDuration)

      if (!validation.isValid) {
        console.error('❌ Loop validation failed:', validation.failures)

        // Show validation errors to user (you can enhance this with a proper modal)
        const errorMessages = validation.failures.map(f => f.reason).join('\n')
        alert(`Loop validation failed:\n\n${errorMessages}`)
        return
      }

      console.log('✅ Loop validation passed')
    }

    // Save to database if persistence functions available
    if (saveLoopTimes && videoId && user?.id) {
      console.log('💾 Saving loop times to database...')

      try {
        const result = await saveLoopTimes(videoId, videoTitle, user.id, tempLoopStart, tempLoopEnd)

        if (result) {
          console.log('✅ Loop times saved to database successfully')
        } else {
          console.warn('⚠️ Failed to save loop times to database, continuing with local state')
        }
      } catch (error) {
        console.error('❌ Error saving loop times to database:', error)
        // Continue with local state even if database save fails
      }
    }
    
    // Update the actual loop times
    setLoopStartTime(tempLoopStart)
    setLoopEndTime(tempLoopEnd)
    
    // Start the loop
    setIsLoopActive(true)
    
    // Close modal
    setShowLoopModal(false)
    
    console.log('✅ Loop started with times:', { tempLoopStart, tempLoopEnd })
    
    // Debug: Log the converted seconds
    const startSeconds = timeToSeconds(tempLoopStart)
    const endSeconds = timeToSeconds(tempLoopEnd)
    console.log('🔢 Loop seconds:', { startSeconds, endSeconds })
    
    // CRITICAL: Jump to start time immediately when loop starts
    if (player && player.seekTo && typeof player.seekTo === 'function') {
      try {
        player.seekTo(startSeconds, true)
        console.log('⏭️ Jumped to loop start time:', startSeconds)

        // Ensure video continues playing after seek (YouTube sometimes pauses after multiple seeks)
        setTimeout(() => {
          if (player.playVideo) {
            player.playVideo()
            console.log('▶️ Resumed playback after seek to ensure continuous loop')
          }
        }, 100) // Small delay to let seek complete

      } catch (error) {
        console.error('❌ Initial seek error:', error)
      }
    }
  }

  // Handle cancel loop configuration
  const handleCancelLoop = () => {
    console.log('❌ Loop configuration cancelled')
    // Just close modal, don't start loop or update times
    setShowLoopModal(false)
  }

  // Handle unfavorite cleanup (called when video is unfavorited)
  const handleUnfavoriteCleanup = () => {
    console.log('🧹 Cleaning up loop data for unfavorited video')
    
    // Reset loop state
    setIsLoopActive(false)
    setLoopStartTime('0:00')
    setLoopEndTime('0:00')
    
    // Call parent cleanup if provided
    if (onUnfavoriteCleanup) {
      onUnfavoriteCleanup()
    }
    
    console.log('✅ Loop data cleaned up')
  }

  // Return the loop management functions
  return {
    // Event handlers
    handleLoopClick,
    handleLoopTimesClick,
    handleSaveLoop,
    handleCancelLoop,
    handleUnfavoriteCleanup,
    
    // State (already managed by parent, but could be managed here)
    // isLoopActive,
    // loopStartTime,
    // loopEndTime,
    // showLoopModal,
    // tempLoopStart,
    // tempLoopEnd
  }
}
