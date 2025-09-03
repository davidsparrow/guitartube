// components/watch/YouTubePlayerManager.js - YouTube Player Management Component
import { useState, useEffect, useRef } from 'react'

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
    if (!window.YT) {
      console.log('🎬 Loading YouTube iframe API')
      setYoutubeAPILoading(true)
      setYoutubeAPIError(false)
      
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      
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
    }
  }, [onAPIError])

  // Initialize YouTube player when API is ready
  useEffect(() => {
    if (!videoId) return

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        console.log('🎬 Initializing YouTube player for video:', videoId)
        
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
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              console.log('✅ YouTube player ready')
              setPlayer(newPlayer)
              playerRef.current = newPlayer
              if (onPlayerReady) onPlayerReady(event, newPlayer)
            },
            onStateChange: (event) => {
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

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      console.log('✅ YouTube API already loaded, initializing player')
      initPlayer()
    } else {
      // Wait for API to be ready
      console.log('⏳ Setting up YouTube API ready callback')
      window.onYouTubeIframeAPIReady = () => {
        console.log('✅ YouTube API ready callback triggered')
        initPlayer()
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

  return (
    <div className="relative z-10 overflow-hidden px-6 mt-20" style={{ 
      height: getVideoHeight(),
      transition: 'height 0.3s ease-in-out'
    }}>
      {/* YouTube Player Container */}
      <div 
        className="w-full h-full bg-black rounded-lg overflow-hidden shadow-2xl"
        style={getFlipStyles()}
      >
        {youtubeAPILoading && (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading YouTube Player...</p>
            </div>
          </div>
        )}
        
        {youtubeAPIError && (
          <div className="w-full h-full flex items-center justify-center bg-red-900">
            <div className="text-center text-white">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-lg font-semibold">YouTube Player Error</p>
              <p className="text-sm">Failed to load video player</p>
            </div>
          </div>
        )}
        
        {!youtubeAPILoading && !youtubeAPIError && (
          <div id="youtube-player" className="w-full h-full"></div>
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
