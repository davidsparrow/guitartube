/* components/SongContentScroller.js */


'use client'

import { useState, useEffect, useRef } from 'react'

export default function SongContentScroller({ 
  htmlContent, 
  height = 'h-32', // Default height for table row
  className = '' 
}) {
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const [fontSize, setFontSize] = useState('text-sm')
  const [isPaused, setIsPaused] = useState(false)
  const contentRef = useRef(null)
  const animationRef = useRef(null)

  // Start/stop scrolling
  const toggleScrolling = () => {
    if (isScrolling) {
      stopScrolling()
    } else {
      startScrolling()
    }
  }

  // Start scrolling animation
  const startScrolling = () => {
    if (!contentRef.current) return
    
    setIsScrolling(true)
    setIsPaused(false)
    
    const content = contentRef.current
    const containerHeight = content.parentElement.offsetHeight
    const contentHeight = content.scrollHeight
    
    if (contentHeight <= containerHeight) {
      setIsScrolling(false)
      return
    }

    let position = 0
    const animate = () => {
      if (isPaused) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      
      position += scrollSpeed * 0.5
      
      if (position >= contentHeight - containerHeight) {
        position = 0 // Loop back to top
      }
      
      content.style.transform = `translateY(-${position}px)`
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
  }

  // Stop scrolling
  const stopScrolling = () => {
    setIsScrolling(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  // Skip forward/backward
  const skipTime = (direction) => {
    if (!contentRef.current) return
    
    const content = contentRef.current
    const containerHeight = content.parentElement.offsetHeight
    const skipAmount = containerHeight * 0.5 * direction
    
    const currentPosition = parseFloat(content.style.transform.replace('translateY(-', '').replace('px)', '') || 0)
    const newPosition = Math.max(0, currentPosition + skipAmount)
    
    content.style.transform = `translateY(-${newPosition}px)`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
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

  return (
    <div className={`relative ${height} overflow-hidden bg-white border rounded ${className}`}>
      {/* Controls Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gray-100 border-b px-2 py-1 flex items-center gap-2 text-xs z-10">
        {/* Play/Pause */}
        <button
          onClick={toggleScrolling}
          className={`px-2 py-1 rounded ${isScrolling ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
        >
          {isScrolling ? '⏸️' : '▶️'}
        </button>

        {/* Pause */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`px-2 py-1 rounded ${isPaused ? 'bg-yellow-500 text-white' : 'bg-gray-300'}`}
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>

        {/* Skip Controls */}
        <button
          onClick={() => skipTime(-1)}
          className="px-2 py-1 rounded bg-blue-500 text-white"
        >
          ⏪ 5s
        </button>
        <button
          onClick={() => skipTime(1)}
          className="px-2 py-1 rounded bg-blue-500 text-white"
        >
          5s ⏩
        </button>

        {/* Speed Control */}
        <div className="flex items-center gap-1">
          <span className="text-gray-600">Speed:</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
            className="w-16 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-gray-600 w-8">{scrollSpeed}x</span>
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1">
          <span className="text-gray-600">Font:</span>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="px-1 py-1 text-xs border rounded"
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
      <div className="pt-8 h-full overflow-hidden">
        <div
          ref={contentRef}
          className={`${fontSize} leading-relaxed px-3 transition-transform duration-300`}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          style={{ transform: 'translateY(0px)' }}
        />
      </div>
    </div>
  )
}