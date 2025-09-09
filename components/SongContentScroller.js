/* components/SongContentScroller.js */

'use client'

import { useState, useEffect, useRef } from 'react'
import PauseCaptionsModal from './PauseCaptionsModal'

export default function SongContentScroller({
  content,
  isLoading = false,
  error = null,
  currentTime = 0,
  onRetry = null,
  height = 'h-full', // Default height for table row
  className = '',
  // NEW: Video sync props
  player = null,
  videoId = null,
  userId = null
}) {
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const [fontSize, setFontSize] = useState('text-sm')
  const [isPaused, setIsPaused] = useState(false)
  const contentRef = useRef(null)
  const containerRef = useRef(null)
  const [animationDuration, setAnimationDuration] = useState(30) // seconds

  // NEW: Video sync states
  const [isVideoSyncEnabled, setIsVideoSyncEnabled] = useState(false)
  const [pauseCaptions, setPauseCaptions] = useState([]) // Scroll pause segments
  const [isLoadingPauseCaptions, setIsLoadingPauseCaptions] = useState(false)
  const [isInPauseSegment, setIsInPauseSegment] = useState(false)
  const lastVideoStateRef = useRef(null) // Track video play/pause state
  const lastVideoTimeRef = useRef(0) // Track video time for seeking detection

  // NEW: YouTube speed integration
  const [youtubePlaybackRate, setYoutubePlaybackRate] = useState(1) // YouTube's speed setting
  const [effectiveScrollSpeed, setEffectiveScrollSpeed] = useState(1) // Combined speed

  // NEW: Pause Captions Modal state
  const [showPauseCaptionsModal, setShowPauseCaptionsModal] = useState(false)

  // NEW: Get YouTube playback rate and calculate effective scroll speed
  const updateEffectiveScrollSpeed = () => {
    if (!player) return scrollSpeed

    try {
      const ytRate = player.getPlaybackRate ? player.getPlaybackRate() : 1
      setYoutubePlaybackRate(ytRate)

      // Combined speed = user scroll speed × YouTube playback rate
      const combined = scrollSpeed * ytRate
      setEffectiveScrollSpeed(combined)

      console.log('🎛️ Speed calculation:', {
        userScrollSpeed: scrollSpeed,
        youtubeRate: ytRate,
        effectiveSpeed: combined
      })

      return combined
    } catch (error) {
      console.error('❌ Error getting YouTube playback rate:', error)
      return scrollSpeed
    }
  }

  // Calculate animation duration based on content height and effective speed
  const calculateAnimationDuration = () => {
    if (!contentRef.current || !containerRef.current) return 30

    const containerHeight = containerRef.current.offsetHeight
    const contentHeight = contentRef.current.scrollHeight
    const scrollDistance = Math.max(0, contentHeight - containerHeight)

    // Use effective speed (user speed × YouTube rate) for duration calculation
    const currentEffectiveSpeed = isVideoSyncEnabled ? updateEffectiveScrollSpeed() : scrollSpeed

    // Base duration: 1 pixel per 50ms, adjusted by effective speed
    const baseDuration = scrollDistance / 20 // 20 pixels per second base speed
    return Math.max(5, baseDuration / currentEffectiveSpeed) // Minimum 5 seconds
  }

  // NEW: Load pause-scroll records from text_captions table
  const loadPauseCaptions = async () => {
    if (!videoId || !userId) return

    try {
      setIsLoadingPauseCaptions(true)

      // Import supabase client
      const { supabase } = await import('../lib/supabase')

      // Get favorite record for this video
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (favoriteError) {
        console.log('No favorite record found for pause-scroll records')
        setPauseCaptions([])
        return
      }

      // Load pause-scroll records (using captions table with row_type = 3)
      const { data: pauseData, error: pauseError } = await supabase
        .from('captions')
        .select('*')
        .eq('favorite_id', favoriteData.id)
        .eq('row_type', 3)
        .order('start_time')

      if (pauseError) throw pauseError

      setPauseCaptions(pauseData || [])
      console.log('📋 Loaded pause-scroll records:', pauseData?.length || 0)

    } catch (error) {
      console.error('❌ Error loading pause-scroll records:', error)
      setPauseCaptions([])
    } finally {
      setIsLoadingPauseCaptions(false)
    }
  }

  // Update animation duration when speed changes
  useEffect(() => {
    const newDuration = calculateAnimationDuration()
    setAnimationDuration(newDuration)
  }, [scrollSpeed, content])

  // NEW: Restart animation when user changes scroll speed in sync mode
  useEffect(() => {
    if (isVideoSyncEnabled && isScrolling && !isPaused) {
      console.log('🔄 User scroll speed changed in sync mode, restarting animation')
      startScrolling() // Restart with new effective speed
    }
  }, [scrollSpeed, isVideoSyncEnabled])

  // Reset scroll position to top
  const resetScrollPosition = () => {
    if (!contentRef.current) return
    console.log('🔄 resetScrollPosition called - this will reset to top!')
    setIsScrolling(false)
    setIsPaused(false)
    // Reset CSS animation
    contentRef.current.style.animation = 'none'
    contentRef.current.style.transform = 'translateY(0px)'
  }

  // Single Play/Pause toggle (like a video player)
  const togglePlayPause = () => {
    if (!isScrolling) {
      // Not scrolling -> Start playing
      startScrolling()
    } else if (isPaused) {
      // Scrolling but paused -> Resume
      resumeScrolling()
    } else {
      // Scrolling and playing -> Pause
      pauseScrolling()
    }
  }

  // Resume scrolling (separate from start for clarity)
  const resumeScrolling = () => {
    if (!contentRef.current || !isScrolling) return

    setIsPaused(false)
    contentRef.current.style.animationPlayState = 'running'
    console.log('🎵 Resuming scrolling')
  }

  // Pause scrolling (separate from stop for clarity)
  const pauseScrolling = () => {
    if (!contentRef.current || !isScrolling) return

    setIsPaused(true)
    contentRef.current.style.animationPlayState = 'paused'
    console.log('🎵 Pausing scrolling')
  }

  // Start scrolling animation using CSS
  const startScrolling = () => {
    if (!contentRef.current || !containerRef.current) return

    console.log('🎵 startScrolling called, current states:', { isScrolling, isPaused })

    const containerHeight = containerRef.current.offsetHeight
    const contentHeight = contentRef.current.scrollHeight

    if (contentHeight <= containerHeight) {
      console.log('⚠️ Content too short to scroll')
      return
    }

    setIsScrolling(true)
    setIsPaused(false)

    // Calculate scroll distance and duration using effective speed
    const scrollDistance = contentHeight - containerHeight
    const duration = calculateAnimationDuration() // This now uses effective speed in sync mode

    // Get current effective speed for logging
    const currentEffectiveSpeed = isVideoSyncEnabled ? updateEffectiveScrollSpeed() : scrollSpeed

    console.log('🎯 Starting CSS animation:', {
      duration,
      scrollDistance,
      userSpeed: scrollSpeed,
      youtubeRate: youtubePlaybackRate,
      effectiveSpeed: currentEffectiveSpeed,
      syncMode: isVideoSyncEnabled
    })

    // Apply CSS animation
    contentRef.current.style.animation = `scrollDown ${duration}s linear infinite`
    contentRef.current.style.setProperty('--scroll-distance', `-${scrollDistance}px`)
    contentRef.current.style.animationPlayState = 'running'
  }

  // Stop scrolling
  const stopScrolling = () => {
    if (!contentRef.current) return

    setIsScrolling(false)
    setIsPaused(false)
    contentRef.current.style.animation = 'none'
  }

  // NEW: Video sync logic - handles video play/pause events and pause-scroll segments
  const handleVideoSync = () => {
    if (!isVideoSyncEnabled || !player) return

    try {
      const videoState = player.getPlayerState()
      const currentVideoTime = player.getCurrentTime() || 0

      // Add detailed logging for debugging
      const lastVideoTime = lastVideoTimeRef.current
      const timeDifference = Math.abs(currentVideoTime - lastVideoTime)
      const wasSeeking = timeDifference > 2 // If time jumped more than 2 seconds, likely seeking

      // Log every video sync check when at beginning or seeking detected
      if (currentVideoTime <= 5 || wasSeeking) {
        console.log('🔍 Video sync check:', {
          videoState,
          currentTime: currentVideoTime,
          lastTime: lastVideoTime,
          timeDiff: timeDifference,
          wasSeeking,
          scrollTop: contentRef.current?.scrollTop || 0
        })
      }

      // Reset scroll to top when:
      // 1. Video is playing AND at beginning (0-5 seconds) AND we have been scrolling
      // 2. OR when user seeks back to beginning (big time jump to start)
      if (contentRef.current && currentVideoTime <= 5) {
        const currentScrollTop = contentRef.current.scrollTop
        const hasAnimation = contentRef.current.style.animation && contentRef.current.style.animation !== 'none'
        const hasBeenScrolling = isScrolling || isPaused || hasAnimation // Check if we've been scrolling

        const shouldReset = (
          (videoState === 1 && hasBeenScrolling) || // Playing at start and we've been scrolling
          (wasSeeking && lastVideoTime > 10) // Seeked back from later time
        )

        console.log('🔍 Reset check at beginning:', {
          shouldReset,
          videoState,
          currentTime: currentVideoTime,
          scrollTop: currentScrollTop,
          hasAnimation,
          hasBeenScrolling,
          isScrolling,
          isPaused,
          wasSeeking,
          lastTime: lastVideoTime
        })

        if (shouldReset) {
          console.log('🔄 Resetting scroll to top - videoState:', videoState, 'time:', currentVideoTime, 'seeking:', wasSeeking)

          // First stop any existing animation completely
          contentRef.current.style.animation = 'none'
          contentRef.current.style.transform = 'translateY(0)'

          // Force a reflow to ensure animation is stopped
          contentRef.current.offsetHeight

          // Reset scroll position
          contentRef.current.scrollTop = 0

          // Reset states
          setIsPaused(false)
          setIsScrolling(false)

          console.log('✅ Scroll reset complete, position:', contentRef.current.scrollTop)
        }
      }

      // Update last video time for next comparison
      lastVideoTimeRef.current = currentVideoTime

      // Check if we're in a pause-scroll segment
      const activePauseSegment = pauseCaptions.find(segment => {
        const startTime = parseTimeToSeconds(segment.start_time)
        const endTime = parseTimeToSeconds(segment.end_time)
        return currentVideoTime >= startTime && currentVideoTime <= endTime
      })

      const wasInPauseSegment = isInPauseSegment
      const nowInPauseSegment = !!activePauseSegment
      setIsInPauseSegment(nowInPauseSegment)

      // Video state change logic
      if (videoState === 1) { // PLAYING
        if (nowInPauseSegment) {
          // Video playing but we're in pause segment - keep scrolling paused
          if (!isPaused) {
            console.log('🚫 Video playing but in pause-scroll segment:', activePauseSegment.line1)
            pauseScrolling()
          }
        } else {
          // Video playing and not in pause segment - start/resume scrolling
          if (!isScrolling) {
            console.log('▶️ Video started - starting scroll sync at time:', currentVideoTime)
            startScrolling()
          } else if (isPaused) {
            console.log('▶️ Video resumed - resuming scroll sync at time:', currentVideoTime)
            resumeScrolling()
          }
        }
      } else if (videoState === 2) { // PAUSED
        // Video paused - pause scrolling regardless of pause segments
        if (isScrolling && !isPaused) {
          console.log('⏸️ Video paused - pausing scroll sync at time:', currentVideoTime)
          pauseScrolling()
        }
      }

      // Handle entering/exiting pause segments
      if (!wasInPauseSegment && nowInPauseSegment) {
        console.log('🚫 Entering pause-scroll segment:', activePauseSegment.line1)
        if (isScrolling && !isPaused && videoState === 1) {
          pauseScrolling()
        }
      } else if (wasInPauseSegment && !nowInPauseSegment) {
        console.log('✅ Exiting pause-scroll segment')
        if (isScrolling && isPaused && videoState === 1) {
          resumeScrolling()
        }
      }

      lastVideoStateRef.current = videoState

    } catch (error) {
      console.error('❌ Error in video sync:', error)
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

  // NEW: Save scroll speed to favorites table
  const saveScrollSpeedToFavorites = async (speed) => {
    if (!videoId || !userId) return

    try {
      const { supabase } = await import('../lib/supabase')

      // First try to update existing favorite
      const { data: existingFavorite, error: selectError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (existingFavorite) {
        // Update existing favorite
        const { error: updateError } = await supabase
          .from('favorites')
          .update({
            scroll_speed: speed,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingFavorite.id)

        if (updateError) {
          console.error('❌ Error updating scroll speed:', updateError)
        } else {
          console.log('💾 Updated scroll speed:', speed, 'for video:', videoId)
        }
      } else {
        // Create new favorite record
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({
            user_id: userId,
            video_id: videoId,
            scroll_speed: speed,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('❌ Error creating favorite with scroll speed:', insertError)
        } else {
          console.log('💾 Created favorite with scroll speed:', speed, 'for video:', videoId)
        }
      }
    } catch (error) {
      console.error('❌ Error saving scroll speed:', error)
    }
  }

  // NEW: Load saved scroll speed from favorites table
  const loadSavedScrollSpeed = async () => {
    if (!videoId || !userId) return

    try {
      const { supabase } = await import('../lib/supabase')

      const { data, error } = await supabase
        .from('favorites')
        .select('scroll_speed')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      if (error) {
        console.log('No saved scroll speed found, using default')
        return
      }

      if (data?.scroll_speed && data.scroll_speed !== scrollSpeed) {
        setScrollSpeed(data.scroll_speed)
        console.log('📖 Loaded saved scroll speed:', data.scroll_speed)
      }
    } catch (error) {
      console.error('❌ Error loading scroll speed:', error)
    }
  }

  // Skip forward/backward by adjusting animation delay
  const skipTime = (direction) => {
    if (!isScrolling || !contentRef.current) return

    const currentDelay = parseFloat(contentRef.current.style.animationDelay || '0')
    const skipAmount = direction * 2 // Skip 2 seconds worth
    const newDelay = currentDelay - skipAmount

    contentRef.current.style.animationDelay = `${newDelay}s`
  }

  // Reset position when content changes
  useEffect(() => {
    resetScrollPosition()
  }, [content])

  // Update animation speed when scrollSpeed changes
  useEffect(() => {
    if (isScrolling && contentRef.current && !isPaused && !isVideoSyncEnabled) {
      // Only restart animation if not paused and not in video sync mode
      startScrolling()
    }
  }, [scrollSpeed])

  // NEW: Load pause-captions when video sync is enabled
  useEffect(() => {
    if (isVideoSyncEnabled && videoId && userId) {
      loadPauseCaptions()
    }
  }, [isVideoSyncEnabled, videoId, userId])

  // NEW: Load saved scroll speed when component mounts
  useEffect(() => {
    if (videoId && userId) {
      loadSavedScrollSpeed()
    }
  }, [videoId, userId])

  // NEW: Video sync monitoring - check every 500ms when sync is enabled
  useEffect(() => {
    if (!isVideoSyncEnabled || !player) return

    const syncInterval = setInterval(() => {
      handleVideoSync()

      // Also check for YouTube speed changes and update animation if needed
      if (isScrolling && !isPaused) {
        const newEffectiveSpeed = updateEffectiveScrollSpeed()

        // If effective speed changed significantly, restart animation with new duration
        if (Math.abs(newEffectiveSpeed - effectiveScrollSpeed) > 0.1) {
          console.log('🔄 YouTube speed changed, updating scroll animation')
          startScrolling() // Restart with new speed
        }
      }
    }, 500) // Check every 500ms

    return () => clearInterval(syncInterval)
  }, [isVideoSyncEnabled, player, pauseCaptions, isScrolling, isPaused, isInPauseSegment, effectiveScrollSpeed])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (contentRef.current) {
        contentRef.current.style.animation = 'none'
      }
    }
  }, [])

  // Font size options
  const fontSizeOptions = [
    { value: 'text-xs', label: 'XS' },
    { value: 'text-sm', label: 'S' },
    { value: 'text-base', label: 'M' },
    { value: 'text-lg', label: 'L' },
    { value: 'text-xl', label: 'XL' }
  ]

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative ${height} overflow-hidden bg-black border rounded ${className} flex items-center justify-center`}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <div className="text-sm">Loading lyrics...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`relative ${height} overflow-hidden bg-black border rounded ${className} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-red-400 text-sm mb-2">Error loading content:</div>
          <div className="text-red-300 text-xs mb-3">{error}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  // No content state
  if (!content) {
    return (
      <div className={`relative ${height} overflow-hidden bg-black border rounded ${className} flex items-center justify-center`}>
        <div className="text-gray-400 text-sm">No content available</div>
      </div>
    )
  }

  return (
    <div className={`relative ${height} overflow-hidden bg-black border rounded ${className}`}>
      {/* CSS Animation Styles */}
      <style jsx>{`
        @keyframes scrollDown {
          0% {
            transform: translateY(0px);
          }
          100% {
            transform: translateY(var(--scroll-distance));
          }
        }
      `}</style>

      {/* Controls Bar - Moved to Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm border-t border-gray-600 px-2 py-1 flex items-center gap-2 text-xs z-10">
        {/* Video Sync Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="video-sync"
            checked={isVideoSyncEnabled}
            onChange={(e) => {
              const enabled = e.target.checked
              setIsVideoSyncEnabled(enabled)
              console.log('🔄 Video sync toggled:', enabled ? 'ON' : 'OFF')

              if (!enabled) {
                // When disabling sync, stop any active scrolling
                if (isScrolling) {
                  stopScrolling()
                }
              } else {
                // When enabling sync, load pause captions
                loadPauseCaptions()

                // If we're at the beginning and have scrolled, reset to top
                if (player && contentRef.current) {
                  const currentTime = player.getCurrentTime() || 0
                  const scrollTop = contentRef.current.scrollTop
                  if (currentTime <= 5 && scrollTop > 50) {
                    console.log('🔄 Sync enabled at beginning, resetting scroll to top')
                    contentRef.current.style.animation = 'none'
                    contentRef.current.scrollTop = 0
                    setIsPaused(false)
                    setIsScrolling(false)
                  }
                }
              }
            }}
            className="w-4 h-4"
          />
          <label htmlFor="video-sync" className="text-xs text-white cursor-pointer">
            📹 Sync with Video
          </label>
        </div>

        {/* Pause Captions Button (only show when sync is enabled) */}
        {isVideoSyncEnabled && (
          <button
            onClick={() => setShowPauseCaptionsModal(true)}
            className="px-3 py-1 rounded text-xs bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            title="Manage pause segments for video sync"
          >
            ⏸️ Pauses
          </button>
        )}

        {/* Single Play/Pause Button (disabled when sync is active) */}
        <button
          onClick={() => {
            console.log('🎵 Play/Pause button clicked! Current state:', { isScrolling, isPaused })
            togglePlayPause()
          }}
          disabled={isVideoSyncEnabled}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            isVideoSyncEnabled
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : isScrolling && !isPaused
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          title={
            isVideoSyncEnabled
              ? 'Manual controls disabled - Video sync is active'
              : !isScrolling
                ? 'Start scrolling'
                : isPaused
                  ? 'Resume scrolling'
                  : 'Pause scrolling'
          }
        >
          {!isScrolling ? '▶️ PLAY' : isPaused ? '▶️ PLAY' : '⏸️ PAUSE'}
        </button>

        {/* Stop Button (disabled when sync is active) */}
        {isScrolling && (
          <button
            onClick={() => {
              console.log('🔴 STOP button clicked! Current state:', { isScrolling, isPaused })
              stopScrolling()
            }}
            disabled={isVideoSyncEnabled}
            className={`px-3 py-2 rounded text-sm transition-colors ${
              isVideoSyncEnabled
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            title={
              isVideoSyncEnabled
                ? 'Manual controls disabled - Video sync is active'
                : 'Stop and reset scrolling'
            }
          >
            ⏹️ STOP
          </button>
        )}

        {/* Skip Controls */}
        <button
          onClick={() => skipTime(-1)}
          className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
          title="Skip backward"
        >
          ⏪
        </button>
        <button
          onClick={() => skipTime(1)}
          className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
          title="Skip forward"
        >
          ⏩
        </button>

        {/* Reset Button */}
        <button
          onClick={resetScrollPosition}
          className="px-2 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-700"
          title="Reset to top"
        >
          🔄
        </button>

        {/* Speed Control (always available) */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-300">Speed:</span>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={scrollSpeed}
            onChange={(e) => {
              const newSpeed = parseFloat(e.target.value)
              setScrollSpeed(newSpeed)
              // Save speed to favorites when changed
              if (videoId && userId) {
                saveScrollSpeedToFavorites(newSpeed)
              }
            }}
            className="w-12 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            title="Adjust scrolling speed (works in sync mode too)"
          />
          <span className="text-xs w-12 text-gray-300" title={
            isVideoSyncEnabled
              ? `User: ${scrollSpeed}x × YouTube: ${youtubePlaybackRate}x = ${effectiveScrollSpeed.toFixed(1)}x`
              : `Scroll speed: ${scrollSpeed}x`
          }>
            {isVideoSyncEnabled ? `${effectiveScrollSpeed.toFixed(1)}x` : `${scrollSpeed}x`}
          </span>
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1">
          <span className="text-gray-300 text-xs">Font:</span>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="px-1 py-1 text-xs border border-gray-600 rounded bg-gray-700 text-gray-200"
          >
            {fontSizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Container */}
      <div ref={containerRef} className="pb-8 h-full overflow-hidden">
        <div
          ref={contentRef}
          className={`${fontSize} leading-relaxed px-3 py-2 font-mono`}
          dangerouslySetInnerHTML={{ __html: content }}
          style={{
            color: 'white',
            backgroundColor: 'transparent',
            animationFillMode: 'both'
          }}
        />
      </div>

      {/* Pause Captions Modal */}
      <PauseCaptionsModal
        isOpen={showPauseCaptionsModal}
        onClose={() => {
          setShowPauseCaptionsModal(false)
          // Reload pause captions after modal closes
          if (isVideoSyncEnabled && videoId && userId) {
            loadPauseCaptions()
          }
        }}
        videoId={videoId}
        userId={userId}
        player={player}
        currentTime={currentTime}
      />
    </div>
  )
}
