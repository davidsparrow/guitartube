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
  onUnfavoriteCleanup
}) {
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

    if (isLoopActive) {
      // Stop the loop
      setIsLoopActive(false)
      console.log('⏹️ Loop stopped')
    } else {
      // Open modal for configuration
      setTempLoopStart(loopStartTime)
      setTempLoopEnd(loopEndTime)
      setShowLoopModal(true)
      console.log('⚙️ Opening loop configuration modal')
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
  const handleSaveLoop = () => {
    console.log('💾 Saving loop configuration:', { tempLoopStart, tempLoopEnd })
    
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
