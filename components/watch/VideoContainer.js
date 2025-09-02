// components/watch/VideoContainer.js - Simplified video player container
import { useEffect, useRef } from 'react'

export default function VideoContainer({
  videoId,
  videoTitle,
  flipState = 'normal',
  onVideoReady,
  onVideoError,
  onStateChange,
  showControlStrips = false
}) {
  const playerRef = useRef(null)

  // Calculate dynamic height based on control strips
  const containerHeight = showControlStrips 
    ? 'calc(100vh - 320px)' // Adjust for control strips
    : 'calc(100vh - 155px)'

  useEffect(() => {
    if (!videoId) return

    // Initialize YouTube player
    const initializePlayer = () => {
      if (window.YT && window.YT.Player) {
        const player = new window.YT.Player('youtube-player', {
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              playerRef.current = event.target
              if (onVideoReady) onVideoReady(event, event.target)
            },
            onError: (error) => {
              if (onVideoError) onVideoError(error)
            },
            onStateChange: (event) => {
              if (onStateChange) onStateChange(event)
            }
          }
        })
      }
    }

    // Load YouTube API if not already loaded
    if (!window.YT) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.body.appendChild(script)
      
      window.onYouTubeIframeAPIReady = initializePlayer
    } else {
      initializePlayer()
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [videoId])

  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-2xl mb-2">🎸</div>
          <div>Loading video...</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="overflow-hidden px-6 mt-20 transition-all duration-300"
      style={{ height: containerHeight }}
    >
      {/* Video Player Container */}
      <div 
        id="video-container" 
        data-testid="video-container" 
        className="w-full max-w-none h-full flex items-center justify-center"
      >
        {/* YouTube Video Player with flip transformations */}
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-2xl">
          <div 
            className="relative w-full h-full transition-transform duration-300"
            style={{
              height: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: flipState === 'horizontal' 
                ? 'scaleX(-1)' 
                : flipState === 'both'
                ? 'scaleX(-1) scaleY(-1)'
                : 'none'
            }}
          >
            {/* YouTube API Player */}
            <div id="youtube-player" className="w-full h-full" />
            
            {/* Fallback iframe if API fails */}
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&showinfo=0&origin=${window.location.origin}`}
              title={videoTitle}
              className="w-full h-full absolute inset-0"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ display: 'none' }} // Hidden by default, shown if API fails
            />
          </div>
        </div>
      </div>
    </div>
  )
}
