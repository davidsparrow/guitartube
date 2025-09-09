/* components/SongContentScroller.js */

'use client'

import { useState, useEffect, useRef } from 'react'

export default function SongContentScroller({
  content,
  isLoading = false,
  error = null,
  currentTime = 0,
  onRetry = null,
  height = 'h-full', // Default height for table row
  className = ''
}) {
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const [fontSize, setFontSize] = useState('text-sm')
  const [isPaused, setIsPaused] = useState(false)
  const contentRef = useRef(null)
  const containerRef = useRef(null)
  const [animationDuration, setAnimationDuration] = useState(30) // seconds

  // Calculate animation duration based on content height and speed
  const calculateAnimationDuration = () => {
    if (!contentRef.current || !containerRef.current) return 30

    const containerHeight = containerRef.current.offsetHeight
    const contentHeight = contentRef.current.scrollHeight
    const scrollDistance = Math.max(0, contentHeight - containerHeight)

    // Base duration: 1 pixel per 50ms, adjusted by speed
    const baseDuration = scrollDistance / 20 // 20 pixels per second base speed
    return Math.max(5, baseDuration / scrollSpeed) // Minimum 5 seconds
  }

  // Update animation duration when speed changes
  useEffect(() => {
    const newDuration = calculateAnimationDuration()
    setAnimationDuration(newDuration)
  }, [scrollSpeed, content])

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

    // Calculate scroll distance
    const scrollDistance = contentHeight - containerHeight
    const duration = calculateAnimationDuration()

    console.log('🎯 Starting CSS animation:', { duration, scrollDistance })

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

  // Clean up - removed old togglePause function, now using pauseScrolling/resumeScrolling

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
    if (isScrolling && contentRef.current && !isPaused) {
      // Only restart animation if not paused
      startScrolling()
    }
  }, [scrollSpeed])

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
        {/* Single Play/Pause Button (like video player) */}
        <button
          onClick={() => {
            console.log('🎵 Play/Pause button clicked! Current state:', { isScrolling, isPaused })
            togglePlayPause()
          }}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            isScrolling && !isPaused
              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          title={
            !isScrolling
              ? 'Start scrolling'
              : isPaused
                ? 'Resume scrolling'
                : 'Pause scrolling'
          }
        >
          {!isScrolling ? '▶️ PLAY' : isPaused ? '▶️ PLAY' : '⏸️ PAUSE'}
        </button>

        {/* Stop Button (only when scrolling) */}
        {isScrolling && (
          <button
            onClick={() => {
              console.log('🔴 STOP button clicked! Current state:', { isScrolling, isPaused })
              stopScrolling()
            }}
            className="px-3 py-2 rounded text-sm bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="Stop and reset scrolling"
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

        {/* Speed Control */}
        <div className="flex items-center gap-1">
          <span className="text-gray-300 text-xs">Speed:</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
            className="w-12 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-gray-300 text-xs w-8">{scrollSpeed}x</span>
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
    </div>
  )
}
