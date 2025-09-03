// hooks/useYouTubePlayer.js - Custom hook for YouTube player management
import { useState, useRef, useCallback } from 'react'

export default function useYouTubePlayer() {
  // Player states
  const [player, setPlayer] = useState(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState(null)
  const playerRef = useRef(null)

  // Player event handlers
  const handlePlayerReady = useCallback((event, playerInstance) => {
    console.log('✅ YouTube player ready in hook')
    setPlayer(playerInstance)
    playerRef.current = playerInstance
    setIsPlayerReady(true)
    setPlayerError(null)
  }, [])

  const handlePlayerStateChange = useCallback((event) => {
    // Handle player state changes (playing, paused, etc.)
    const state = event.data
    console.log('🎬 Player state changed:', state)
    
    // YouTube player states:
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
  }, [])

  const handlePlayerError = useCallback((error) => {
    console.error('❌ YouTube player error in hook:', error)
    setPlayerError(error)
    setIsPlayerReady(false)
  }, [])

  const handleAPIError = useCallback((error) => {
    console.error('❌ YouTube API error in hook:', error)
    setPlayerError(error)
    setIsPlayerReady(false)
  }, [])

  // Player utility methods
  const playerUtils = {
    // Basic controls
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    stop: () => playerRef.current?.stopVideo(),
    
    // Time controls
    getCurrentTime: () => playerRef.current?.getCurrentTime() || 0,
    getDuration: () => playerRef.current?.getDuration() || 0,
    seekTo: (time, allowSeekAhead = true) => playerRef.current?.seekTo(time, allowSeekAhead),
    
    // State checks
    getPlayerState: () => playerRef.current?.getPlayerState(),
    isPlaying: () => playerRef.current?.getPlayerState() === 1,
    isPaused: () => playerRef.current?.getPlayerState() === 2,
    isReady: () => isPlayerReady && !!playerRef.current,
    
    // Volume controls
    setVolume: (volume) => playerRef.current?.setVolume(volume),
    getVolume: () => playerRef.current?.getVolume() || 0,
    mute: () => playerRef.current?.mute(),
    unMute: () => playerRef.current?.unMute(),
    isMuted: () => playerRef.current?.isMuted(),
    
    // Video info
    getVideoUrl: () => playerRef.current?.getVideoUrl(),
    getVideoEmbedCode: () => playerRef.current?.getVideoEmbedCode(),
    
    // Playback rate
    setPlaybackRate: (rate) => playerRef.current?.setPlaybackRate(rate),
    getPlaybackRate: () => playerRef.current?.getPlaybackRate() || 1,
    getAvailablePlaybackRates: () => playerRef.current?.getAvailablePlaybackRates() || [1],
    
    // Quality
    setPlaybackQuality: (quality) => playerRef.current?.setPlaybackQuality(quality),
    getPlaybackQuality: () => playerRef.current?.getPlaybackQuality(),
    getAvailableQualityLevels: () => playerRef.current?.getAvailableQualityLevels() || [],
    
    // Direct player access (for advanced use)
    getPlayer: () => playerRef.current
  }

  // Format time utilities
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const parseTime = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return 0
    
    const parts = timeString.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0
      const secs = parseInt(parts[1]) || 0
      return mins * 60 + secs
    }
    return 0
  }

  return {
    // State
    player,
    isPlayerReady,
    playerError,
    
    // Event handlers (for YouTubePlayerManager)
    handlePlayerReady,
    handlePlayerStateChange,
    handlePlayerError,
    handleAPIError,
    
    // Utilities
    ...playerUtils,
    formatTime,
    parseTime
  }
}
