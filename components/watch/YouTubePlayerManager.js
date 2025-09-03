// components/watch/YouTubePlayerManager.js - YouTube Player Management Component
import { useState, useEffect, useRef } from 'react'

// Helper function to decode YouTube player states
const getPlayerStateText = (state) => {
  switch (state) {
    case -1: return 'UNSTARTED'
    case 0: return 'ENDED'
    case 1: return 'PLAYING'
    case 2: return 'PAUSED'
    case 3: return 'BUFFERING'
    case 5: return 'CUED'
    default: return `UNKNOWN(${state})`
  }
}

export default function YouTubePlayerManager({
  videoId,
  onPlayerReady,
  onPlayerStateChange,
  onPlayerError,
  onAPIError,
  flipState = 'normal',
  showControlStrips = false,
  showRow1 = true,
  showRow2 = true,
  showRow3 = true
}) {
  // YouTube API states
  const [youtubeAPILoading, setYoutubeAPILoading] = useState(false)
  const [youtubeAPIError, setYoutubeAPIError] = useState(false)
  const [player, setPlayer] = useState(null)
  const playerRef = useRef(null)

  // Load YouTube API script
  useEffect(() => {
    // Check if script is already loading or loaded
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')

    if (!window.YT && !existingScript) {
      console.log('🎬 Loading YouTube iframe API')
      setYoutubeAPILoading(true)
      setYoutubeAPIError(false)

      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.id = 'youtube-iframe-api'

      // Add error handling
      tag.onerror = (error) => {
        console.error('❌ Failed to load YouTube iframe API:', error)
        console.error('❌ Error details:', {
          error: error.message,
          type: error.type,
          target: tag.src
        })
        setYoutubeAPILoading(false)
        setYoutubeAPIError(true)
        if (onAPIError) onAPIError(error)
      }

      tag.onload = () => {
        console.log('✅ YouTube iframe API loaded successfully')
        setYoutubeAPILoading(false)
      }

      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    } else if (window.YT) {
      console.log('✅ YouTube API already available')
      setYoutubeAPILoading(false)
      setYoutubeAPIError(false)
    } else if (existingScript) {
      console.log('⏳ YouTube API script already loading...')
      setYoutubeAPILoading(true)
      setYoutubeAPIError(false)
    }
  }, [onAPIError])

  // Initialize YouTube player when API is ready
  useEffect(() => {
    if (!videoId) {
      console.log('⏭️ No videoId provided, skipping player initialization')
      return
    }

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        console.log('🎬 Initializing YouTube player for video:', videoId)

        // Clear any existing player first
        if (playerRef.current) {
          console.log('🧹 Cleaning up existing player')
          try {
            playerRef.current.destroy()
          } catch (e) {
            console.log('⚠️ Error destroying existing player:', e)
          }
          playerRef.current = null
          setPlayer(null)
        }

        // Detect mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        console.log('📱 Device detection:', { isMobile, userAgent: navigator.userAgent })
        
        // Check if the target element exists
        const targetElement = document.getElementById('youtube-player')
        if (!targetElement) {
          console.error('❌ YouTube player target element not found!')
          setYoutubeAPIError(true)
          return
        }

        console.log('🎯 Target element found, creating player:', targetElement)

        const newPlayer = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            controls: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0, // Disable YouTube's fullscreen button
            origin: window.location.origin,
            // Mobile-specific improvements
            playsinline: 1, // Prevent fullscreen on mobile
            enablejsapi: 1, // Enable JavaScript API for better control
            disablekb: 0, // Keep keyboard controls enabled
            iv_load_policy: 3 // Hide video annotations
          },
          events: {
            onReady: (event) => {
              console.log('✅ YouTube player ready')
              setPlayer(newPlayer)
              playerRef.current = newPlayer

              // Add click event listeners for debugging
              const iframe = document.getElementById('youtube-player')
              if (iframe) {
                console.log('🎯 Adding click event listeners to YouTube player')

                iframe.addEventListener('click', (e) => {
                  console.log('🖱️ CLICK EVENT on YouTube player:', {
                    type: e.type,
                    target: e.target,
                    currentTarget: e.currentTarget,
                    timeStamp: e.timeStamp,
                    isTrusted: e.isTrusted,
                    playerState: newPlayer.getPlayerState ? newPlayer.getPlayerState() : 'unknown'
                  })
                })

                iframe.addEventListener('touchstart', (e) => {
                  console.log('👆 TOUCHSTART EVENT on YouTube player:', {
                    type: e.type,
                    touches: e.touches.length,
                    timeStamp: e.timeStamp,
                    playerState: newPlayer.getPlayerState ? newPlayer.getPlayerState() : 'unknown'
                  })
                })

                iframe.addEventListener('touchend', (e) => {
                  console.log('👆 TOUCHEND EVENT on YouTube player:', {
                    type: e.type,
                    changedTouches: e.changedTouches.length,
                    timeStamp: e.timeStamp,
                    playerState: newPlayer.getPlayerState ? newPlayer.getPlayerState() : 'unknown'
                  })
                })
              }

              if (onPlayerReady) onPlayerReady(event, newPlayer)
            },
            onStateChange: (event) => {
              console.log('🎬 YouTube player state changed:', {
                state: event.data,
                stateText: getPlayerStateText(event.data),
                timeStamp: Date.now()
              })
              if (onPlayerStateChange) onPlayerStateChange(event)
            },
            onError: (error) => {
              console.error('❌ YouTube player error:', error)
              if (onPlayerError) onPlayerError(error)
            }
          }
        })
      } else {
        console.log('⏳ YouTube API not ready yet, waiting...')
      }
    }

    // Add a small delay to ensure DOM is ready, then initialize
    const initTimer = setTimeout(() => {
      // Check if API is already loaded
      if (window.YT && window.YT.Player) {
        console.log('✅ YouTube API already loaded, initializing player')
        initPlayer()
      } else {
        // Wait for API to be ready
        console.log('⏳ Setting up YouTube API ready callback')
        window.onYouTubeIframeAPIReady = () => {
          console.log('✅ YouTube API ready callback triggered')
          // Add another small delay after API is ready
          setTimeout(initPlayer, 50)
        }
      }
    }, 100) // Small delay to ensure DOM is ready

    // Cleanup function
    return () => {
      clearTimeout(initTimer)
      if (playerRef.current) {
        console.log('🧹 Cleaning up player on unmount')
        try {
          playerRef.current.destroy()
        } catch (e) {
          console.log('⚠️ Error destroying player on unmount:', e)
        }
        playerRef.current = null
      }
    }
  }, [videoId, onPlayerReady, onPlayerStateChange, onPlayerError])

  // Calculate video container height based on control strips (matches original calculation)
  const getVideoHeight = () => {
    if (showControlStrips) {
      // Calculate height based on visible rows (matches original watch.js logic)
      const baseHeight = 160
      const row1Height = showRow1 ? 51.2 : 0
      const row2Height = showRow2 ? 102.4 : 0
      const row3Height = showRow3 ? 102.4 : 0
      const totalHeight = baseHeight + row1Height + row2Height + row3Height
      return `calc(100vh - ${totalHeight}px)`
    }
    return 'calc(100vh - 155px)'
  }

  // Get flip transform styles
  const getFlipStyles = () => {
    switch (flipState) {
      case 'horizontal':
        return { transform: 'scaleX(-1)' }
      case 'both':
        return { transform: 'scaleX(-1) scaleY(-1)' }
      case 'normal':
      default:
        return { transform: 'none' }
    }
  }

  // Expose player instance and utility methods
  const playerUtils = {
    getPlayer: () => playerRef.current,
    getCurrentTime: () => playerRef.current?.getCurrentTime() || 0,
    getDuration: () => playerRef.current?.getDuration() || 0,
    seekTo: (time) => playerRef.current?.seekTo(time),
    playVideo: () => playerRef.current?.playVideo(),
    pauseVideo: () => playerRef.current?.pauseVideo(),
    getPlayerState: () => playerRef.current?.getPlayerState(),
    isReady: () => !!playerRef.current && typeof playerRef.current.getCurrentTime === 'function'
  }

  // Component is rendering properly

  return (
    <div className="relative z-10 overflow-hidden px-6 mt-20" style={{
      height: getVideoHeight(),
      transition: 'height 0.3s ease-in-out'
    }}>
      {/* YouTube Player Container */}
      <div
        id="video-container"
        data-testid="video-container"
        className="w-full h-full bg-black rounded-lg overflow-hidden shadow-2xl"
        style={{
          ...getFlipStyles(),
          // Improve mobile touch interaction
          touchAction: 'manipulation',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
        onClick={(e) => {
          console.log('🎯 CONTAINER CLICK:', {
            target: e.target.tagName,
            currentTarget: e.currentTarget.tagName,
            timeStamp: e.timeStamp,
            type: e.type
          })
        }}
        onTouchStart={(e) => {
          console.log('👆 CONTAINER TOUCHSTART:', {
            touches: e.touches.length,
            timeStamp: e.timeStamp
          })
        }}
        onTouchEnd={(e) => {
          console.log('👆 CONTAINER TOUCHEND:', {
            changedTouches: e.changedTouches.length,
            timeStamp: e.timeStamp
          })
        }}
      >
        {youtubeAPILoading && (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading YouTube Player...</p>
            </div>
          </div>
        )}
        
        {youtubeAPIError && videoId && (
          <div className="w-full h-full">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&showinfo=0&origin=${window.location.origin}`}
              title="YouTube Video Player (Fallback)"
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={getFlipStyles()}
            />
          </div>
        )}

        {youtubeAPIError && !videoId && (
          <div className="w-full h-full flex items-center justify-center bg-red-900">
            <div className="text-center text-white">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-lg font-semibold">YouTube Player Error</p>
              <p className="text-sm">No video ID provided</p>
            </div>
          </div>
        )}
        
        {!youtubeAPILoading && !youtubeAPIError && (
          <div
            id="youtube-player"
            className="w-full h-full"
            style={{
              // Ensure proper mobile touch handling
              pointerEvents: 'auto',
              touchAction: 'manipulation'
            }}
          ></div>
        )}
      </div>
      
      {/* Video Info Overlay */}
      {videoId && (
        <div className="absolute top-4 left-10 z-10">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="text-white text-sm font-medium">
              Video ID: {videoId}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
