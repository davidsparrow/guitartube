// pages/watch_s.js - Watch Scrolling Lyrics + chord-captions Page with YouTube Video Player
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../contexts/UserContext'
import AuthModal from '../components/AuthModal'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'






import { BiHide } from "react-icons/bi"
import { LuTextSelect } from "react-icons/lu"
import { PiScrollFill, PiPlaylistFill, PiPauseCircleBold, PiPlayFill, PiPauseFill, PiRewindFill, PiFastForwardFill, PiArrowULeftUpBold, PiPaintBrushBroadFill } from "react-icons/pi"
import TopBanner from '../components/TopBanner'
import Header from '../components/Header'
import WatchFooter from '../components/WatchFooter'
import MenuModal from '../components/MenuModal'
import SupportModal from '../components/SupportModal'
import {
  parseTimeToSeconds,
  formatSecondsToTime,
  timeToSeconds,
  autoResolveCaptionConflicts,
  getVideoDuration,
  calculateSmartCaptionDuration
} from '../utils/captionUtils'
import {
  DeleteConfirmModal,
  CaptionEditorModal,
  LoopConfigModal,
  CustomAlertModal
} from '../components/CaptionModals'
import {
  saveUserDefaultCaptionDuration,
  checkIfVideoFavorited,
  removeFavorite,
  loadCaptions,
  saveCaption,
  updateCaption,
  deleteCaption,
  addFavorite
} from '../utils/CaptionDatabase'
import {
  handleVideoReady as handleVideoReadyFromUtils,
  handleVideoError as handleVideoErrorFromUtils,
  checkForSavedSession as checkForSavedSessionFromUtils,
  showResumePrompt as showResumePromptFromUtils,
  resumeVideo as resumeVideoFromUtils,
  startFromBeginning as startFromBeginningFromUtils,
  checkPlayerStateForWatchTime as checkPlayerStateForWatchTimeFromUtils,
  handleKeyPress as handleKeyPressFromUtils,
  isPlayerReady as isPlayerReadyFromUtils,
  isVideoPlaying as isVideoPlayingFromUtils,
  showVideoPlayingRestriction as showVideoPlayingRestrictionFromUtils
} from '../utils/videoPlayerUtils'
import ChordCaptionModal from '../components/ChordCaptionModal'
import { deleteAllChordCaptions, saveChordCaptions } from '../song_data_processing/chord_processing/ChordCaptionDatabase'
import LayoutSelectionModal from '../components/LayoutSelectionModal'
import CaptionManager from '../components/watch/CaptionManager'
import useCaptionManager from '../hooks/useCaptionManager'
import useLoopManagerComponent from '../components/watch/LoopManager'
import useLoopManager from '../hooks/useLoopManager'
import SongContentScroller from '../components/SongContentScroller' // FIXED: No more dangerouslySetInnerHTML
import { fetchLyrics, extractSongInfo, generateFallbackLyrics } from '../utils/lyricsUtils'

export default function WatchS() {





  const { isAuthenticated, user, loading, signOut } = useAuth()
  const { profile, planType, hasPlanAccess, canSearch } = useUser()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Video player states
  const [videoId, setVideoId] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoChannel, setVideoChannel] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  // Embedded YouTube player states (matching watch_ORIG4.js)
  const [player, setPlayer] = useState(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const playerRef = useRef(null)

  // Embedded YouTube player utility functions
  const getCurrentTime = () => playerRef.current?.getCurrentTime() || 0
  const getDuration = () => playerRef.current?.getDuration() || 0
  const seekTo = (time) => playerRef.current?.seekTo(time, true)
  const play = () => playerRef.current?.playVideo()
  const pause = () => playerRef.current?.pauseVideo()
  const isPlaying = () => playerRef.current?.getPlayerState() === 1

  // Handle YouTube player state changes (matching watch_ORIG4.js)
  const handlePlayerStateChange = (event) => {
    // YouTube player state changed

    // YouTube player states:
    // -1: UNSTARTED, 0: ENDED, 1: PLAYING, 2: PAUSED, 3: BUFFERING, 5: CUED

    // Log state changes for debugging (watch time tracking still works)
    if (event.data === 1) { // PLAYING
      // Video started playing
    } else if (event.data === 2) { // PAUSED
      // Video paused

      // Save session data for Login-Resume functionality when user pauses
      if (user?.id) {
        // Use the player instance for immediate access
        if (player && player.getPlayerState && typeof player.getPlayerState === 'function') {
          console.log('🔄 Triggering session save on pause...')
          saveSessionOnPause()
        } else {
          console.log('⚠️ Player not ready for session save')
        }
      } else {
        // Save conditions NOT met - session save blocked
      }
    } else if (event.data === 3) { // BUFFERING
      // Video buffering
    } else if (event.data === 5) { // CUED
      // Video cued
    }
  }

  // Handle video ready (matching watch_ORIG4.js)
  const handleVideoReady = (event, newPlayer) => {
    console.log('🎬 Video ready, checking for saved session')

    // Use utility function for video ready handling
    handleVideoReadyFromUtils(event, newPlayer, {
      user,
      videoId,
      checkForSavedSession,
      supabase
    })
  }

  // Page type for specialized watch experiences
  const [pageType, setPageType] = useState('default') // 'default', 'lyrics', 'chords', 'tabs', 'lyrics-chords', 'lyrics-tabs'

  // Layout selection state
  const [currentLayout, setCurrentLayout] = useState('default') // 'default' or layout IDs from modal
  const [showLayoutModal, setShowLayoutModal] = useState(false)

  // Helper function to determine which rows should be visible based on layout
  const getLayoutRowVisibility = (layoutId) => {
    switch (layoutId) {
      case 'single-chords':
        return { showRow1: false, showRow2: true, showRow3: false }
      case 'single-tabs':
        return { showRow1: false, showRow2: false, showRow3: true }
      case 'chords-tabs':
        return { showRow1: false, showRow2: true, showRow3: true }
      case 'lyrics-chords':
        return { showRow1: true, showRow2: true, showRow3: false }
      case 'lyrics-tabs':
        return { showRow1: true, showRow2: false, showRow3: true }
      case 'tabs-chords':
        return { showRow1: false, showRow2: true, showRow3: true }
      case 'lyrics-chords-tabs':
        return { showRow1: true, showRow2: true, showRow3: true }
      case 'lyrics-tabs-chords':
        return { showRow1: true, showRow2: true, showRow3: true }
      case 'scroll-lyrics-chords':
        return { showRow1: true, showRow2: true, showRow3: false }
      case 'scroll-lyrics-tabs':
        return { showRow1: true, showRow2: false, showRow3: true }
      case 'default':
      default:
        return { showRow1: true, showRow2: true, showRow3: true }
    }
  }
  
  // Control strip states - MODIFIED FOR SCROLLING VERSION
  const [showControlStrips, setShowControlStrips] = useState(false)
  // Single row for scrolling content instead of three separate rows
  const [showScrollRow, setShowScrollRow] = useState(true)

  // SCROLLING CONTENT STATES - NEW FOR watch_s.js
  const [songContent, setSongContent] = useState('')
  const [isLoadingSongContent, setIsLoadingSongContent] = useState(false)
  const [lyricsSource, setLyricsSource] = useState('api') // 'api' or 'static'
  const [lyricsError, setLyricsError] = useState(null)

  // CHORD CAPTION STATES FOR SVG DISPLAY - NEW FOR watch_s.js
  const [chordCaptions, setChordCaptions] = useState([])
  const [isLoadingChordCaptions, setIsLoadingChordCaptions] = useState(false)
  const [chordCaptionsError, setChordCaptionsError] = useState(null)
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0) // For chord SVG updates

  // Video flip states
  const [flipState, setFlipState] = useState('normal') // 'normal', 'horizontal', 'vertical'
  
  // Loop management via custom hook
  const {
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
    resetLoopState,
    startLoop,
    stopLoop,
    openLoopModal,
    closeLoopModal,
    applyLoopSettings,
    cancelLoopSettings,

    // Persistence functions
    saveLoopTimes,
    loadLoopTimes,
    deleteLoopTimes,
    validateLoopTimes
  } = useLoopManager()
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // User access control states
  const [isVideoFavorited, setIsVideoFavorited] = useState(false)
  const [showUnfavoriteWarning, setShowUnfavoriteWarning] = useState(false)

  // Database operation states (needed by useCaptionManager)
  const [isLoadingCaptions, setIsLoadingCaptions] = useState(false)
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false)
  const [dbError, setDbError] = useState(null)
  const [conflictRowIndex, setConflictRowIndex] = useState(null) // For highlighting invalid captions

  // Custom alert modal states (must be before useCaptionManager)
  const [showCustomAlert, setShowCustomAlert] = useState(false)
  const [customAlertMessage, setCustomAlertMessage] = useState('')
  const [customAlertButtons, setCustomAlertButtons] = useState([])

  // Custom alert modal utility functions (must be before useCaptionManager)
  const showCustomAlertModal = (message, buttons = []) => {
    setCustomAlertMessage(message)
    setCustomAlertButtons(buttons)
    setShowCustomAlert(true)
  }

  const hideCustomAlertModal = () => {
    setShowCustomAlert(false)
    setCustomAlertMessage('')
    setCustomAlertButtons([])
  }

  // Caption management via custom hook
  const {
    captions,
    setCaptions,
    isInCaptionMode,
    setIsInCaptionMode,
    editingCaptionId,
    setEditingCaptionId,
    originalCaptionsSnapshot,
    setOriginalCaptionsSnapshot,
    showCaptionModal,
    setShowCaptionModal,
    editingCaption,
    setEditingCaption,
    isAddingNewCaption,
    setIsAddingNewCaption,
    showDeleteConfirm,
    setShowDeleteConfirm,
    captionToDelete,
    setCaptionToDelete,
    handleSaveCaptions,
    handleCancelCaptions,
    handleDuplicateCaption,
    handleDeleteCaption,
    handleDeleteAllCaptions,
    handleOpenCaptionModal,
    handleAddCaptionFromTimeline: handleAddCaptionFromTimelineHook
  } = useCaptionManager({
    videoId,
    user,
    setIsLoadingCaptions,
    setDbError,
    player,
    getVideoDuration,
    setConflictRowIndex,
    showCustomAlertModal,
    hideCustomAlertModal
  })

  const [userDefaultCaptionDuration, setUserDefaultCaptionDuration] = useState(10) // User's preferred caption duration in seconds
  
  // 🎸 CHORD CAPTION SYSTEM STATE VARIABLES 🎸
  // =============================================
  const [showChordModal, setShowChordModal] = useState(false)        // Controls chord modal visibility
  const [isLoadingChords, setIsLoadingChords] = useState(false)      // Loading state for chord operations
  const [originalChordCaptionsBlob, setOriginalChordCaptionsBlob] = useState(null) // Store original chord captions as JSON blob for cancel functionality
  // =============================================
  
  // Search functionality states
  const [searchQuery, setSearchQuery] = useState('')

  // SCROLLING CONTENT FUNCTIONS - NEW FOR watch_s.js
  // Load song content from multiple sources
  const loadSongContent = async () => {
    try {
      setIsLoadingSongContent(true)
      setLyricsError(null)

      // Extract song info from video title and channel
      const songInfo = extractSongInfo(videoTitle, videoChannel)

      console.log('🎵 Loading lyrics for:', songInfo, 'Source preference:', lyricsSource)

      let content = null
      let source = null

      // Try API first if preferred, otherwise try static files first
      if (lyricsSource === 'api') {
        try {
          const lyricsData = await fetchLyrics(songInfo.title, songInfo.artist)
          if (lyricsData && lyricsData.html) {
            content = lyricsData.html
            source = 'API'
            console.log('✅ Lyrics loaded from API:', lyricsData.metadata)
          }
        } catch (apiError) {
          console.warn('API failed, trying static files:', apiError.message)
          // Try static files as fallback
          try {
            content = await loadStaticSongContent()
            source = 'Static File'
            console.log('✅ Lyrics loaded from static file')
          } catch (staticError) {
            throw new Error(`Both API and static files failed. API: ${apiError.message}, Static: ${staticError.message}`)
          }
        }
      } else {
        // Try static files first
        try {
          content = await loadStaticSongContent()
          source = 'Static File'
          console.log('✅ Lyrics loaded from static file')
        } catch (staticError) {
          console.warn('Static file failed, trying API:', staticError.message)
          // Try API as fallback
          try {
            const lyricsData = await fetchLyrics(songInfo.title, songInfo.artist)
            if (lyricsData && lyricsData.html) {
              content = lyricsData.html
              source = 'API'
              console.log('✅ Lyrics loaded from API:', lyricsData.metadata)
            }
          } catch (apiError) {
            throw new Error(`Both static files and API failed. Static: ${staticError.message}, API: ${apiError.message}`)
          }
        }
      }

      if (content) {
        setSongContent(content)
        console.log(`🎵 Content loaded from ${source}`)
      } else {
        throw new Error('No content received from any source')
      }

    } catch (error) {
      console.error('Error loading song content:', error)
      setLyricsError(error.message)

      // Generate fallback content based on video info
      const songInfo = extractSongInfo(videoTitle, videoChannel)
      const fallbackContent = generateFallbackLyrics(songInfo.title, songInfo.artist)
      setSongContent(fallbackContent)
    } finally {
      setIsLoadingSongContent(false)
    }
  }

  // Load static song content from HTML files
  const loadStaticSongContent = async () => {
    // For now, we'll use the example song content
    // In a real implementation, this would select based on the current video
    const response = await fetch('/song_data/song_clean_output_1647373.html')

    if (!response.ok) {
      throw new Error(`Static file not found: ${response.status}`)
    }

    const htmlContent = await response.text()

    // Extract the song content from the HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    const preElement = doc.querySelector('pre')

    if (preElement) {
      // Get the inner HTML and add proper styling for chords
      let content = preElement.innerHTML

      // Add CSS styling for proper chord display
      const styledContent = `
        <style>
          .chord {
            color: #00ff00;
            font-weight: bold;
            font-size: 0.9em;
          }
          .gtab {
            margin: 2px 0;
            line-height: 1.4;
            font-family: monospace;
            white-space: pre;
            color: white;
          }
          pre {
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.4;
            color: white;
            background: black;
          }
          body {
            background: black;
            color: white;
          }
          * {
            color: white;
          }
          .chord {
            color: #00ff00 !important;
          }
        </style>
        ${content}
      `
      return styledContent
    } else {
      throw new Error('No song content found in static file')
    }
  }

  // Load chord captions for the current video - NEW FOR watch_s.js
  const loadChordCaptions = async () => {
    try {
      setIsLoadingChordCaptions(true)
      setChordCaptionsError(null)

      if (!user?.id || !videoId) {
        console.log('🔍 No user ID or video ID, skipping chord caption loading')
        return
      }

      console.log('🎸 Loading chord captions for video:', videoId)

      // First get the favorite record for this video
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .single()

      if (favoriteError) {
        if (favoriteError.code === 'PGRST116') {
          // No favorite found
          console.log('🔍 No favorite found for this video, no chord captions to load')
          setChordCaptions([])
          return
        }
        throw favoriteError
      }

      // Now get chord captions for this favorite, joined with chord_positions via chord_position_id
      const { data, error } = await supabase
        .from('chord_captions')
        .select('*, chord_position:chord_positions!fk_chord_captions_chord_position_id (id, chord_position_full_name, aws_svg_url_dark, aws_svg_url_light)')
        .eq('favorite_id', favoriteData.id)
        .order('start_time', { ascending: true })

      if (error) throw error

      console.log('🎸 Chord captions loaded:', data?.length || 0, 'records')

      // Log each chord caption with chord name and fret position
      if (data && data.length > 0) {
        console.log('🎸 Chord Caption Records:')
        data.forEach((chord, index) => {
          console.log(`${index + 1}. Chord: ${chord.chord_name}, Fret Position: ${chord.fret_position || 'N/A'}, Start: ${chord.start_time}, End: ${chord.end_time}`)
        })
      } else {
        console.log('🎸 No chord captions found for this video')
      }

      setChordCaptions(data || [])

    } catch (err) {
      console.error('❌ Error loading chord captions:', err)
      setChordCaptionsError('Failed to load chord captions')
      setChordCaptions([])
    } finally {
      setIsLoadingChordCaptions(false)
    }
  }

  // Load user's default caption duration from database
  const loadUserDefaultCaptionDuration = async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('default_caption_duration_seconds')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error('Error loading default caption duration:', error)
        return
      }
      
      if (data?.default_caption_duration_seconds) {
        setUserDefaultCaptionDuration(data.default_caption_duration_seconds)

      }
    } catch (error) {
      console.error('Error loading default caption duration:', error)
    }
  }

  // Save user's default caption duration to database - now imported from CaptionDatabase


    


  // New Caption Placement Dialog states
  const [showAddCaptionDialog, setShowAddCaptionDialog] = useState(false)
  const [selectedSerialNumber, setSelectedSerialNumber] = useState(null)

  // Database operation states - MOVED ABOVE useCaptionManager hook
  
  // Watch time tracking states
  const [watchStartTime, setWatchStartTime] = useState(null)
  const [isTrackingWatchTime, setIsTrackingWatchTime] = useState(false)
  const lastSavedSessionRef = useRef(null)
  const saveTimeoutRef = useRef(null) // Add timeout ref for debouncing
  
  // Using iframe approach - no API loading states needed

  // Feature Gates states
  const [featureGates, setFeatureGates] = useState(null)
  const [featureGatesLoading, setFeatureGatesLoading] = useState(true)

  // Daily limit upgrade modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [dailyLimitInfo, setDailyLimitInfo] = useState(null)
  const [currentDailyTotal, setCurrentDailyTotal] = useState(0) // Track current daily watch time total





  // Save session data when user pauses video for Login-Resume functionality
  const saveSessionOnPause = async () => {
    console.log('💾 SAVING LAST WATCHED SESSION - Starting save process...')

    if (!user?.id) {
      console.log('❌ Save blocked: No user ID')
      return
    }
    if (!player) {
      console.log('❌ Save blocked: No player instance')
      return
    }
    if (!isVideoReady) {
      console.log('❌ Save blocked: Video not ready')
      return
    }
    if (!videoId) {
      console.log('❌ Save blocked: No video ID')
      return
    }

    try {
      const currentTime = getCurrentTime()
      console.log('💾 Current video time:', currentTime, 'seconds')

      const videoData = player.getVideoData ? player.getVideoData() : {}
      const videoTitleFromPlayer = videoData.title || videoTitle
      const channelName = videoData.author || videoChannel

      console.log('💾 Saving watch data:', {
        userId: user.id,
        videoId,
        timestamp: currentTime,
        title: videoTitle,
        channelName
      })

      const response = await fetch('/api/user/update-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          videoId,
          timestamp: currentTime,
          title: videoTitle,
          channelId: '', // YouTube doesn't provide channel ID easily
          channelName
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ LAST WATCHED SESSION SAVED successfully:', result)
      } else {
        console.error('❌ Failed to save session data on pause:', response.status)
        const errorText = await response.text()
        console.error('❌ Error details:', errorText)
      }
    } catch (error) {
      console.error('❌ Save session on pause error:', error)
      console.error('❌ Error stack:', error.stack)
    }
  }

  // Resume session save functionality integrated into existing watch time tracking system below

  // Basic Supabase database operations
  const saveFavorite = async (videoData) => {
    try {
      setIsLoadingFavorites(true)
      setDbError(null)
      
      const { data, error } = await supabase
        .from('favorites')
        .insert([{
          user_id: user?.id,
          video_id: videoData.videoId,
          video_title: videoData.videoTitle,
          video_channel: videoData.videoChannel,
          video_thumbnail: videoData.videoThumbnail,
          video_duration_seconds: videoData.videoDuration
        }])
        .select()
      
      if (error) throw error
      
      return data[0]
    } catch (error) {
      console.error('❌ Error saving favorite:', error)
      setDbError('Failed to save favorite')
      return null
    } finally {
      setIsLoadingFavorites(false)
    }
  }

  // Load captions function - now imported from CaptionDatabase

  // checkIfVideoFavorited function - now imported from CaptionDatabase

  // removeFavorite function - now imported from CaptionDatabase



  // Helper functions to get messages from Admin Settings
  const getAdminMessage = (messageKey, fallback) => {
    return featureGates?.global_settings?.[messageKey] || fallback
  }



  // saveCaption function - now imported from CaptionDatabase

  // updateCaption function - now imported from CaptionDatabase

  // deleteCaption function - now imported from CaptionDatabase

  // Watch time tracking functions
  const startWatchTimeTracking = () => {
    if (!videoId || !user?.id || !videoChannel) return null
    const startTime = Date.now()
    return startTime
  }

  const stopWatchTimeTracking = (startTime) => {
    if (!startTime || !videoId || !user?.id || !videoChannel) return
    
    const endTime = Date.now()
    const watchDurationSeconds = Math.floor((endTime - startTime) / 1000)
    
    if (watchDurationSeconds > 0) {
      saveWatchTimeToDatabase(watchDurationSeconds, startTime)
    }
  }

  const saveWatchTimeToDatabase = async (watchDurationSeconds, startTimestamp) => {
    try {
      if (!videoId || !user?.id || !videoChannel || watchDurationSeconds <= 0) return

      // DEBOUNCING: Clear any existing timeout to prevent rapid successive calls
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        // Cleared previous save timeout
      }

      // DEBOUNCING: Set new timeout for 1 second to prevent duplicates
      saveTimeoutRef.current = setTimeout(async () => {
        const endTimestamp = new Date().toISOString()
        const startTimestampISO = new Date(startTimestamp).toISOString()

        // Check if we already saved this exact session to prevent duplicates
        const sessionKey = `${videoId}-${Math.floor(startTimestamp / 1000)}` // Round to nearest second
        
        if (lastSavedSessionRef.current === sessionKey) {
  
          return
        }

        const { data, error } = await supabase
          .from('channel_watch_time')
          .insert([{
            user_id: user.id,
            video_id: videoId,
            video_title: videoTitle,
            channel_name: videoChannel,
            channel_id: '',
            watch_time_seconds: watchDurationSeconds,
            watch_date: new Date().toISOString().split('T')[0],
            watch_timestamp_start: startTimestampISO,
            watch_timestamp_stop: endTimestamp
          }])
          .select()

        if (error) throw error
        
        // Mark this session as saved to prevent duplicates
        lastSavedSessionRef.current = sessionKey
        

      }, 1000) // 1 second debounce

    } catch (error) {
      console.error('❌ Error saving watch time:', error)
    }
  }

  // Query daily watch time total from Supabase
  const getDailyWatchTimeTotal = async () => {
    if (!user?.id) return
    
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('channel_watch_time')
        .select('watch_time_seconds')
        .eq('user_id', user.id)
        .eq('watch_date', today)

      if (error) throw error

      const totalSeconds = data.reduce((sum, record) => sum + record.watch_time_seconds, 0)
      const totalMinutes = (totalSeconds / 60).toFixed(1)
      
              // Daily watch time from Supabase
      
      // Update the current daily total state for feature access checks
      setCurrentDailyTotal(parseFloat(totalMinutes))
      
      return totalMinutes
    } catch (error) {
      console.error('❌ Error querying daily watch time:', error)
      return 0
    }
  }

  // Check daily watch time limits - consolidated function
  const checkDailyWatchTimeLimits = (dailyMinutes, options = {}) => {
    if (!user?.id || !planType) return options.returnBoolean ? false : null

    // Get daily limits from feature gates (dynamic from admin settings)
    const dailyLimits = featureGates?.daily_watch_time_limits || {
      'freebird': 60,      // 60 minutes per day (1 hour) - fallback
      'roadie': 180,       // 180 minutes per day (3 hours) - fallback
      'hero': 480          // 480 minutes per day (8 hours) - fallback
    }

    const userLimit = dailyLimits[planType] || dailyLimits.freebird
    const hasExceeded = dailyMinutes >= userLimit
    
    // Update state if requested (for limit checking)
    if (options.updateState) {
      setCurrentDailyTotal(parseFloat(dailyMinutes))
    }
    
    // Show toast if exceeded
    if (hasExceeded) {
      const tierNames = { freebird: 'Freebird', roadie: 'Roadie', hero: 'Hero' };
      const currentTierName = tierNames[planType] || 'Freebird';
      const hoursLimit = Math.floor(userLimit / 60);
      const minutesLimit = userLimit % 60;
      const timeDisplay = hoursLimit > 0 ?
        (minutesLimit > 0 ? `${hoursLimit}h ${minutesLimit}m` : `${hoursLimit} hour${hoursLimit > 1 ? 's' : ''}`) :
        `${minutesLimit} minutes`;

      const message = `⏰ Daily Watch Time Limit Reached!\n\nYou've used all ${timeDisplay} in your ${currentTierName} plan today.\n\nUpgrade for more watch time or try again tomorrow!`
      showToast(message, 'warning', [
        { text: 'VIEW PLANS', action: () => window.open('/pricing', '_blank') },
        { text: 'OK', action: () => dismissAllToasts() }
      ])
    }
    
    // Return boolean for feature access checks, or object for limit checking
    if (options.returnBoolean) {
      return !hasExceeded  // true if NOT exceeded (can access feature)
    }
    
    return { hasExceeded, planType, dailyMinutes, userLimit }
  }

  // Loop management component - initialized after required functions are defined
  const loopManager = useLoopManagerComponent({
    player,
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
    checkDailyWatchTimeLimits,
    currentDailyTotal,
    onUnfavoriteCleanup: resetLoopState,

    // Video and user context for persistence
    videoId,
    videoTitle,
    user,

    // Loop manager hook functions
    saveLoopTimes,
    loadLoopTimes,
    deleteLoopTimes,
    validateLoopTimes
  })

  // Feature Gates Helper Functions
  const loadFeatureGates = async () => {
    try {
      setFeatureGatesLoading(true)
      // Loading feature gates configuration
      
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'feature_gates')
        .single()

      if (error) {
        console.error('❌ Error loading feature gates:', error)
        return
      }

      if (data && data.setting_value) {
        setFeatureGates(data.setting_value)

      } else {
        
      }
    } catch (error) {
      console.error('❌ Error in loadFeatureGates:', error)
    } finally {
      setFeatureGatesLoading(false)
    }
  }

  const checkFeatureAccess = (featureKey, options = {}) => {
    if (!featureGates || !featureGates.feature_gates) {
      
      return { hasAccess: false, reason: 'feature_gates_not_loaded' }
    }

    const feature = featureGates.feature_gates[featureKey]
    if (!feature) {
      
      return { hasAccess: false, reason: 'feature_not_configured' }
    }

    // Check if feature is enabled
    if (!feature.is_enabled) {
      return { hasAccess: false, reason: 'feature_disabled', message: 'This feature is currently disabled' }
    }

    // Check tier requirement
    const tierOrder = { 'freebird': 0, 'roadie': 1, 'hero': 2 }
    const userTier = planType || 'freebird'
    const requiredTier = feature.min_tier || 'freebird'
    
    if (tierOrder[userTier] < tierOrder[requiredTier]) {
      const message = feature.messages?.tier_restriction || 
        `Requires ${requiredTier.toUpperCase()} Plan or higher`
      return { 
        hasAccess: false, 
        reason: 'tier_restriction', 
        message,
        upgradeButton: feature.upgrade_button
      }
    }

    // Check video playing restriction
            if (options.checkVideoPlaying && feature.video_restricted && isVideoPlayingFromUtils(player)) {
      const message = feature.messages?.video_playing || 
        featureGates.global_settings?.video_playing_message || 
        'Please pause video before using this feature'
      return { 
        hasAccess: false, 
        reason: 'video_playing', 
        message 
      }
    }

    return { hasAccess: true }
  }



  const getFeatureRestrictionMessage = (featureKey, options = {}) => {
    const access = checkFeatureAccess(featureKey, options)
    if (access.hasAccess) return null
    
    return {
      message: access.message,
      reason: access.reason,
      upgradeButton: access.upgradeButton
    }
  }

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check daily watch time limits when profile loads
  useEffect(() => {
    if (profile && profile.subscription_tier && user?.id) {
      // User plan confirmed - checking daily watch time limits
      getDailyWatchTimeTotal().then(dailyMinutes => {
        if (dailyMinutes) {
          checkDailyWatchTimeLimits(parseFloat(dailyMinutes), { updateState: true })
        }
      })
    }
  }, [profile, user?.id])

  // Load feature gates configuration
  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadFeatureGates()
    }
  }, [mounted, isAuthenticated])

  // Feature gates state tracking
  useEffect(() => {
    if (featureGates) {
      // Feature gates state updated
    }
  }, [featureGates, planType])

  // Check scrolling lyrics access control
  useEffect(() => {
    if (featureGates && profile && mounted) {
      const scrollingLyricsGate = featureGates.feature_gates?.scrolling_lyrics
      if (scrollingLyricsGate && scrollingLyricsGate.is_enabled) {
        const userTier = profile.subscription_tier || 'freebird'
        const requiredTiers = scrollingLyricsGate.required_tiers || ['hero']

        if (!requiredTiers.includes(userTier)) {
          console.log('🚫 Access denied to scrolling lyrics page - redirecting to regular watch page')
          // Redirect to regular watch page with same video
          const currentUrl = new URL(window.location.href)
          const params = new URLSearchParams(currentUrl.search)
          router.push(`/watch?${params.toString()}`)
          return
        }
      }
    }
  }, [featureGates, profile, mounted, router])

  // Track when user data becomes available
  useEffect(() => {
    // User data useEffect triggered
  }, [user, profile, loading, isAuthenticated])

  // Load YouTube API script (restored for full controls)
  useEffect(() => {
    if (mounted && !window.YT) {
      console.log('🎬 Loading YouTube iframe API')

      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'

      tag.onerror = (error) => {
        console.error('❌ Failed to load YouTube iframe API:', error)
      }

      tag.onload = () => {
        console.log('✅ YouTube API script loaded')
      }

      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    } else if (mounted && window.YT) {
      console.log('🎬 YouTube API already loaded')
    }
  }, [mounted])

  // Initialize YouTube player when API is ready (restored for full controls)
  useEffect(() => {
    if (mounted && videoId) {
      console.log('🎬 Initializing YouTube player for video:', videoId)

      const initPlayer = () => {
        if (window.YT && window.YT.Player) {
          const newPlayer = new window.YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
              controls: 1,              // ✅ Show YouTube controls & timeline
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              fs: 0,                   // Disable YouTube's fullscreen button
              origin: window.location.origin
            },
            events: {
              onReady: (event) => {
                console.log('✅ YouTube player ready')
                setPlayer(newPlayer)
                playerRef.current = newPlayer
                setIsVideoReady(true)

                // Handle video ready with utilities
                handleVideoReady(event, newPlayer)
              },
              onStateChange: handlePlayerStateChange,
              onError: handleVideoError
            }
          })
        }
      }

      // Check if API is already loaded
      if (window.YT && window.YT.Player) {
        initPlayer()
      } else {
        // Wait for API to be ready
        window.onYouTubeIframeAPIReady = () => {
          console.log('🎬 YouTube API ready callback triggered')
          initPlayer()
        }
      }
    }
  }, [mounted, videoId])

  // Load video from URL parameters when page loads
  useEffect(() => {

    
    // Try to get video data from URL if router isn't ready yet
    if (mounted && !router.isReady) {

      const urlParams = new URLSearchParams(window.location.search)
      const v = urlParams.get('v')
      const title = urlParams.get('title')
      const channel = urlParams.get('channel')
      
      if (v) {
        
        setVideoId(v)
        setVideoTitle(title ? decodeURIComponent(title) : '')
        setVideoChannel(channel ? decodeURIComponent(channel) : '')
        // Video ready state now managed by YouTubePlayerManager
      } else {
        // No video ID in URL, redirecting to home
        router.push('/')
      }
    } else if (mounted && router.isReady) {
      const { v, title, channel, type } = router.query
      if (v && typeof v === 'string') {

        setVideoId(v)
        setVideoTitle(title ? decodeURIComponent(title) : '')
        setVideoChannel(channel ? decodeURIComponent(channel) : '')
        // Video ready state now managed by YouTubePlayerManager

        // Handle page type parameter for specialized experiences
        if (type && typeof type === 'string') {
          const validTypes = ['lyrics', 'chords', 'tabs', 'lyrics-chords', 'lyrics-tabs']
          if (validTypes.includes(type)) {
            setPageType(type)
            console.log(`🎯 Specialized watch page: ${type}`)
          } else {
            setPageType('default')
            console.warn(`⚠️ Invalid page type: ${type}, using default`)
          }
        } else {
          setPageType('default')
        }

        // Query daily watch time total when video loads
        if (user?.id) {
          // Video loaded - querying daily watch time total
          getDailyWatchTimeTotal()

          // Check for saved session data to resume video
          console.log('🔍 TRIGGERING SESSION CHECK from video ready handler')
          checkForSavedSession(v)
        }


      } else {
        // No video ID provided, redirecting to home
        // No video ID provided, redirect to home
        router.push('/')
      }
    } else {
      // Video loading conditions not met
    }
  }, [mounted, router.isReady, router.query])

  // Fallback: Check URL immediately when component mounts
  useEffect(() => {
    if (mounted) {

      const urlParams = new URLSearchParams(window.location.search)
      const v = urlParams.get('v')
      const title = urlParams.get('title')
      const channel = urlParams.get('channel')
      
      if (v && !videoId) {
        
        setVideoId(v)
        setVideoTitle(title ? decodeURIComponent(title) : '')
        setVideoChannel(channel ? decodeURIComponent(channel) : '')
        // Video ready state now managed by YouTubePlayerManager
        
        // Check for saved session data in fallback case too
        if (user?.id) {
          console.log('🔍 TRIGGERING SESSION CHECK from fallback handler')
          checkForSavedSession(v)
        }
      }
    }
  }, [mounted, videoId])

  // Check if video is favorited when video loads or user changes
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (videoId && user?.id) {
        const isFavorited = await checkIfVideoFavorited(videoId, user?.id)
        setIsVideoFavorited(isFavorited)
        // Favorite status checked
      }
    }
    
    checkFavoriteStatus()
  }, [videoId, user?.id])

  // Load captions when video loads or user changes
  useEffect(() => {
    const loadVideoCaptions = async () => {
      // Caption loading effect triggered
      
      if (videoId && user?.id && isVideoFavorited) {
  
        const videoCaptions = await loadCaptions(videoId, user?.id, setIsLoadingCaptions, setDbError)
        
        setCaptions(videoCaptions)
        
      } else {
        
        setCaptions([])
      }
    }
    
    loadVideoCaptions()
  }, [videoId, user?.id, isVideoFavorited])

  // Load scrolling content when video changes - NEW FOR watch_s.js
  useEffect(() => {
    if (videoId && videoTitle) {
      console.log('🎵 Loading scrolling content for video:', videoId, videoTitle)
      loadSongContent()
    }
  }, [videoId, videoTitle, videoChannel, lyricsSource])

  // Load chord captions when video changes - NEW FOR watch_s.js
  useEffect(() => {
    if (videoId && user?.id) {
      console.log('🎸 Loading chord captions for video:', videoId)
      loadChordCaptions()
    }
  }, [videoId, user?.id, isVideoFavorited])

  // Update current time for chord SVG display - NEW FOR watch_s.js
  useEffect(() => {
    if (!player || !isPlayerReadyFromUtils(player)) return

    const timeUpdateInterval = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime()
        setCurrentTimeSeconds(Math.floor(currentTime))
      } catch (error) {
        console.error('Error getting current time for chord display:', error)
      }
    }, 1000) // Update every second

    return () => clearInterval(timeUpdateInterval)
  }, [player])

  // Automatic watch time tracking
  useEffect(() => {
    // Watch time tracking useEffect executed
    
    // Track execution count
    useEffect.executionCount = (useEffect.executionCount || 0) + 1
    
    if (!player || !isPlayerReadyFromUtils(player) || !user?.id || !videoId || !videoChannel) {
      // Watch time tracking paused - conditions not met
      return
    }

    // Set up polling to check player state
    let lastPlayerState = null
    const checkPlayerState = () => {
      // Use utility function for checking player state and managing watch time tracking
      const result = checkPlayerStateForWatchTimeFromUtils({
        player,
        isPlayerReady: isPlayerReadyFromUtils,
        isTrackingWatchTime,
        startWatchTimeTracking,
        stopWatchTimeTracking,
        setWatchStartTime,
        setIsTrackingWatchTime,
        watchStartTime
      })

      if (result.changed) {
        console.log(`🔄 Watch time tracking ${result.action}`)
      }

      // Also check for resume session save when video is paused
      if (user?.id && player && player.getPlayerState && typeof player.getPlayerState === 'function') {
        try {
          const currentState = player.getPlayerState()

          // If state changed from playing (1) to paused (2), save session
          if (lastPlayerState === 1 && currentState === 2) {
            console.log('🔄 Video paused - triggering session save...')
            saveSessionOnPause()
          }

          lastPlayerState = currentState
        } catch (error) {
          console.error('Error checking player state for resume session:', error)
        }
      }
    }

    // Check player state every 2 seconds
    const intervalId = setInterval(checkPlayerState, 2000)

    // Cleanup function
    return () => {
      clearInterval(intervalId)
      if (isTrackingWatchTime && watchStartTime) {
        stopWatchTimeTracking(watchStartTime)
      }
    }
  }, [player, user?.id, videoId, videoChannel, isTrackingWatchTime, watchStartTime])





  // Handle login/logout
  const handleAuthClick = async () => {
    if (isAuthenticated) {
      try {
        await signOut()
        setShowAuthModal(false)
        setShowMenuModal(false)
      } catch (error) {
        console.error('Sign out failed:', error)
      }
    } else {
      setShowAuthModal(true)
    }
  }

  // Handle search submission - navigate to search page with query
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // Video player functions (now handled by YouTubePlayerManager)
  // These functions are kept for compatibility with existing utility functions

  const handleVideoError = (error) => {
    // Use utility function for video error handling
    handleVideoErrorFromUtils(error, {
      onError: (error) => {
        // Custom error handling if needed
        console.error('Custom video error handling:', error)
      }
    })
  }

  // Check for saved session data and resume video if available
  const checkForSavedSession = async (currentVideoId) => {
    console.log('📱 STARTING SAVED SESSION CHECK')
    console.log(`   - Current video ID: ${currentVideoId}`)
    console.log(`   - User ID: ${user?.id}`)
    console.log(`   - Auto-resume enabled: YES (dialog will be skipped)`)

    // Use utility function for checking saved session with resume prompt enabled
    await checkForSavedSessionFromUtils(currentVideoId, {
      userId: user?.id,
      showResumePrompt, // This will trigger auto-resume without dialog
      supabase
    })

    console.log('📱 SAVED SESSION CHECK COMPLETED')
  }

  // Auto-resume video without dialog - WAIT FOR PLAYER TO BE READY
  const showResumePrompt = (timestamp, title) => {
    console.log(`🎯 SCHEDULING AUTO-RESUME at ${timestamp} seconds for "${title}" - waiting for player to be ready`)

    // Wait for player to be ready before resuming
    const waitForPlayer = () => {
      console.log(`⏳ Checking if player is ready... playerRef.current:`, !!playerRef.current)

      if (playerRef.current && playerRef.current.seekTo && typeof playerRef.current.seekTo === 'function') {
        console.log(`✅ PLAYER READY - Starting auto-resume at ${timestamp} seconds`)

        // Player is ready, now resume the video
        resumeVideo(timestamp)

        console.log(`🎯 Auto-resume command sent to player`)
      } else {
        console.log(`⏳ Player not ready yet, will retry in 500ms...`)
        console.log(`   - playerRef.current exists: ${!!playerRef.current}`)
        console.log(`   - seekTo method exists: ${!!(playerRef.current && playerRef.current.seekTo)}`)

        // Check again in 500ms
        setTimeout(waitForPlayer, 500)
      }
    }

    // Start waiting for player
    waitForPlayer()
  }

  // Resume video at saved timestamp
  const resumeVideo = (timestamp) => {
    console.log(`🎯 RESUMING VIDEO at ${timestamp} seconds`)
    console.log(`   - playerRef.current exists: ${!!playerRef.current}`)
    console.log(`   - seekTo method exists: ${!!(playerRef.current && playerRef.current.seekTo)}`)

    // Use utility function for resuming video
    resumeVideoFromUtils(timestamp, {
      playerRef,
      hideCustomAlertModal
    })

    console.log(`✅ Resume command completed - video should now be playing from ${timestamp} seconds`)
  }

  // Start video from beginning
  const startFromBeginning = () => {
    // Use utility function for starting video from beginning
    startFromBeginningFromUtils({
      playerRef: { current: player },
      hideCustomAlertModal
    })
  }



  // handlePlayerStateChange is now defined earlier in the file before useYouTubePlayer hook

  // Handle YouTube API loading errors
  const handleYouTubeAPIError = () => {
    console.error('❌ YouTube API failed to load')
    // Could show a retry button or fallback message
  }

  // Handle keyboard shortcuts for video control
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Spacebar for play/pause - use utility function
      if (e.code === 'Space' && isPlayerReadyFromUtils(player)) {
        handleKeyPressFromUtils(e, {
          isPlayerReady: isPlayerReadyFromUtils,
          player,
          getDailyWatchTimeTotal
        })
      }
      
      // F11 for fullscreen toggle
      if (e.code === 'F11') {
        e.preventDefault()
        handleFullscreenToggle()
      }
      
      // Escape to exit fullscreen
      if (e.code === 'Escape' && isFullscreen) {
        handleFullscreenToggle()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [player, isVideoReady, isFullscreen])



  // Check if user can access loop functionality
  const canAccessLoops = () => {
    const hasAccess = planType !== 'freebird' && isVideoFavorited
            // Access check
    return hasAccess
  }

  // Handle control strips toggle - MODIFIED FOR SCROLLING VERSION
  const handleControlStripsToggle = () => {
    // Check daily watch time limits before allowing control strips feature
    if (!checkDailyWatchTimeLimits(currentDailyTotal, { returnBoolean: true })) {
              // Control Strips access blocked - daily limit exceeded
      return
    }

    const newState = !showControlStrips
            // Toggle clicked

    if (newState) {
      // When showing control strips, ensure scrolling row is visible
      setShowScrollRow(true)
    }

    setShowControlStrips(newState)
  }

  // Handle individual row hide/show - MODIFIED FOR SCROLLING VERSION
  const handleRowToggle = (rowNumber) => {
    // Check if video is playing
    if (isVideoPlayingFromUtils(player)) {
      showVideoPlayingRestrictionFromUtils({
        getAdminMessage,
        showCustomAlertModal,
        hideCustomAlertModal
      })
      return
    }

    // In scrolling version, we only have one row, so hide the entire control strips
    setShowControlStrips(false)
  }

  // Handle show all rows (reset) - MODIFIED FOR SCROLLING VERSION
  const handleShowAllRows = () => {
    // Check if video is playing
    if (isVideoPlayingFromUtils(player)) {
      showVideoPlayingRestrictionFromUtils({
        getAdminMessage,
        showCustomAlertModal,
        hideCustomAlertModal
      })
      return
    }

    // In scrolling version, show the control strips and scrolling row
    setShowControlStrips(true)
    setShowScrollRow(true)
  }

  // Handle favorite/unfavorite video
  const handleFavoriteToggle = async () => {
    if (isVideoFavorited) {
      // Show warning before unfavoriting
      setShowUnfavoriteWarning(true)
    } else {
      // Add to favorites
      try {
        // Get actual video duration from player, or use 1 as minimum to satisfy database constraint
        let videoDuration = 1 // Default minimum value
        if (player && player.getDuration && typeof player.getDuration === 'function') {
          try {
            const duration = player.getDuration()
            if (duration && duration > 0) {
              videoDuration = Math.floor(duration)
            }
          } catch (error) {
            console.warn('⚠️ Could not get video duration from player:', error)
          }
        }

        const videoData = {
          videoId,
          videoTitle,
          videoChannel,
          videoThumbnail: '', // TODO: Get from YouTube API
          videoDuration: videoDuration // Use actual duration or minimum value
        }
        
        const savedFavorite = await saveFavorite(videoData)
        if (savedFavorite) {
          setIsVideoFavorited(true)
  
        } else {
          console.error('❌ Failed to save favorite to database')
        }
      } catch (error) {
        console.error('❌ Error in handleFavoriteToggle:', error)
        setDbError('Failed to save favorite')
      }
    }
  }

  // Handle unfavorite confirmation
  const handleUnfavoriteConfirm = async () => {
    try {
      const removed = await removeFavorite(videoId, user?.id)
      if (removed) {
        setIsVideoFavorited(false)
        setShowUnfavoriteWarning(false)
        
        // Wipe loop data from Supabase

        // TODO: Delete loop records from Supabase
        
        // Reset loop state - NOW HANDLED BY LoopManager
        loopManager.handleUnfavoriteCleanup()
        

      } else {
        console.error('❌ Failed to remove favorite from database')
        setDbError('Failed to remove favorite')
      }
    } catch (error) {
      console.error('❌ Error in handleUnfavoriteConfirm:', error)
      setDbError('Failed to remove favorite')
    }
  }

  // Handle unfavorite cancel
  const handleUnfavoriteCancel = () => {
    setShowUnfavoriteWarning(false)
  }

  // Handle caption edit click - NOW PROVIDED BY useCaptionManager HOOK
  const handleCaptionEditClick = (rowNumber) => {
    handleOpenCaptionModal(rowNumber, {
      isVideoPlayingFromUtils,
      player,
      showVideoPlayingRestrictionFromUtils,
      getAdminMessage,
      showCustomAlertModal,
      hideCustomAlertModal,
      canAccessLoops,
      planType,
      isVideoFavorited,
      handleFavoriteToggle
    })
  }

  // Handle chord modal open for Row 2
  const handleChordModalOpen = () => {
    // Check if video is playing
    if (isVideoPlayingFromUtils(player)) {
      showVideoPlayingRestrictionFromUtils({
        getAdminMessage,
        showCustomAlertModal,
        hideCustomAlertModal
      })
      return
    }
    
    // Check if user can access captions (same as loops)
    if (!canAccessLoops()) {
      if (planType === 'freebird') {
        showCustomAlertModal(getAdminMessage('plan_upgrade_message', '🔒 Chord captions require a paid plan. Please upgrade to access this feature.'), [
          { text: 'UPGRADE PLAN', action: () => window.open('/pricing', '_blank') },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      if (!isVideoFavorited) {
        showCustomAlertModal(getAdminMessage('save_to_favorites_message', '⭐ Please save this video to favorites before editing chord captions.'), [
          { text: 'SAVE TO FAVORITES', action: () => { hideCustomAlertModal(); handleFavoriteToggle(); } },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
            return
    }

    // Open chord modal
    setShowChordModal(true)
  }









  // Handle adding new caption from timeline - NOW PROVIDED BY useCaptionManager HOOK
  const handleAddCaptionFromTimeline = () => {
    handleAddCaptionFromTimelineHook({
      showCustomAlertModal,
      hideCustomAlertModal,
      player,
      videoId,
      user,
      setIsLoadingCaptions,
      setDbError,
      userDefaultCaptionDuration
    })
  }

  // Handle duplicate caption - NOW PROVIDED BY useCaptionManager HOOK
  const handleDuplicateCaptionWrapper = (serialNumber) => {
    handleDuplicateCaption(serialNumber, {
      showCustomAlertModal,
      hideCustomAlertModal,
      player,
      userDefaultCaptionDuration
    })
  }



  // Handle adding new caption at specific position
  const handleAddCaptionAtPosition = async () => {
    if (!selectedSerialNumber) {

      return
    }

    try {
      // Find the target caption by serial number
      const targetCaption = captions.find(caption => caption.serial_number === selectedSerialNumber)
      if (!targetCaption) {
        console.error('❌ Target caption not found')
        return
      }

      let newCaptionStartTime, newCaptionEndTime
      let modifiedCaptions = [...captions]

      // Check if this is the last caption
      const isLastCaption = selectedSerialNumber === Math.max(...captions.map(c => c.serial_number))

      if (isLastCaption) {
        // Option A: After last caption - add user-preferred duration
        newCaptionStartTime = targetCaption.endTime
        newCaptionEndTime = formatSecondsToTime(parseTimeToSeconds(targetCaption.endTime) + (userDefaultCaptionDuration || 10))
        

      } else {
        // Option B: Between existing captions - use duplicate logic
        const startTime = parseTimeToSeconds(targetCaption.startTime)
        const endTime = parseTimeToSeconds(targetCaption.endTime)
        const originalDuration = endTime - startTime
        
        // Modify original caption - reduce duration by 50%
        const newOriginalEndTime = startTime + (originalDuration / 2)
        const newOriginalEndTimeFormatted = formatSecondsToTime(newOriginalEndTime)
        
        // Update original caption
        modifiedCaptions = modifiedCaptions.map(caption => 
          caption.serial_number === selectedSerialNumber 
            ? { ...caption, endTime: newOriginalEndTimeFormatted }
            : caption
        )
        
        // New caption takes the second half
        newCaptionStartTime = newOriginalEndTimeFormatted
        newCaptionEndTime = targetCaption.endTime
        

      }

      // Create new caption
      const newCaption = {
        id: null, // Will get proper database ID when saved
        startTime: newCaptionStartTime,
        endTime: newCaptionEndTime,
        line1: '',
        line2: '',
        rowType: editingCaption?.rowType || 1,
        serial_number: null // Will be assigned by database
      }

      // Add to captions array
      const updatedCaptions = [...modifiedCaptions, newCaption]
      
      // Sort by start time and reassign serial numbers
      const sortedCaptions = updatedCaptions.sort((a, b) => {
        const timeA = parseTimeToSeconds(a.startTime)
        const timeB = parseTimeToSeconds(b.startTime)
        return timeA - timeB
      }).map((caption, index) => ({
        ...caption,
        serial_number: index + 1
      }))

      // Update state
      setCaptions(sortedCaptions)
      
      // Close dialog
      setShowAddCaptionDialog(false)
      setSelectedSerialNumber(null)
      
      
      
    } catch (error) {
      console.error('❌ Error adding caption at position:', error)
      setDbError('Failed to add caption at position')
    }
  }



  // Handle adding new caption from control strip
  const handleAddCaptionFromControlStrip = async (rowNumber) => {
    if (!canAccessLoops()) {
      if (planType === 'freebird') {
        showCustomAlertModal(getAdminMessage('plan_upgrade_message', '🔒 Captions require a paid plan. Please upgrade to access this feature.'), [
          { text: 'UPGRADE PLAN', action: () => window.open('/pricing', '_blank') },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      if (!isVideoFavorited) {
        showCustomAlertModal(getAdminMessage('save_to_favorites_message', '⭐ Please save this video to favorites before editing captions.'), [
          { text: 'SAVE TO FAVORITES', action: () => { hideCustomAlertModal(); handleFavoriteToggle(); } },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      return
    }

    // Check if video is playing
    if (isVideoPlayingFromUtils(player)) {
      showVideoPlayingRestrictionFromUtils({
        getAdminMessage,
        showCustomAlertModal,
        hideCustomAlertModal
      })
      return
    }

    // Get current video time
    let currentTime = 0
    if (player && isPlayerReadyFromUtils(player)) {
      try {
        currentTime = Math.floor(player.getCurrentTime())
      } catch (error) {
        console.error('Error getting current time:', error)
      }
    }

    // SIMPLIFIED RULE: Check if there's a caption currently displayed at this time
    const currentCaption = captions.find(caption => {
      const start = timeToSeconds(caption.startTime)
      const end = timeToSeconds(caption.endTime)
      return currentTime >= start && currentTime <= end
    })

    if (currentCaption) {
      // RULE: If caption exists at current time, DO NOTHING
      
      showCustomAlertModal('Caption already exists at this time', [
        { text: 'OK', action: hideCustomAlertModal }
      ])
      return // Exit function, do nothing
    }

    // Use utility function for smart duration calculation and video length validation
    const { startTime, endTime, wasTrimmed, reason } = calculateSmartCaptionDuration(
      currentTime,
      captions,
      userDefaultCaptionDuration,
      getVideoDuration()
    )
    
    // Convert to MM:SS format using the existing formatSecondsToTime function
    const startTimeString = formatSecondsToTime(startTime)
    const endTimeString = formatSecondsToTime(endTime)

    const newCaption = {
      startTime: startTimeString,
      endTime: endTimeString,
      line1: '',
      line2: '',
      rowType: rowNumber
    }

    // Save caption to database
    const savedCaption = await saveCaption(newCaption, videoId, user?.id, setIsLoadingCaptions, setDbError)
    if (savedCaption) {
      // Add to local state with database ID
      setCaptions(prev => {
        const newCaptions = [...prev, savedCaption]
        
        // Auto-resolve any conflicts that may have been created
        const resolvedCaptions = autoResolveCaptionConflicts(newCaptions)
        
        // If conflicts were resolved, update the state with resolved captions
        if (resolvedCaptions !== newCaptions) {
          // Conflicts were auto-resolved, updating captions state
          return resolvedCaptions
        }
        
        return newCaptions
      })
      
      // Update footer fields to control this caption
      setTempLoopStart(startTimeString)
      setTempLoopEnd(endTimeString)
      
      // Set this as the editing caption
      setEditingCaptionId(savedCaption.id)
      
      // Set caption mode and editing ID for the new caption
      setIsInCaptionMode(true)
      setEditingCaptionId(savedCaption.id)
      
      // Capture original caption state for potential reversion
      setOriginalCaptionsSnapshot(JSON.parse(JSON.stringify(captions)))
      

    } else {
      console.error('❌ Failed to save new caption to database')
      setDbError('Failed to save new caption')
    }
  }

  // Handle saving newly added caption from footer
  const handleSaveNewCaption = async () => {
    if (editingCaptionId) {
      try {
        // Find the current caption to save
        const currentCaption = captions.find(caption => caption.id === editingCaptionId)
        if (currentCaption) {
          // Save any changes to the database
          const updatedCaption = await updateCaption(
            editingCaptionId,
            {
              startTime: currentCaption.startTime,
              endTime: currentCaption.endTime,
              line1: currentCaption.line1,
              line2: currentCaption.line2
            },
            user?.id,
            setIsLoadingCaptions,
            setDbError
          )
          
          if (updatedCaption) {
            console.log('✅ Caption changes saved to database')
          } else {
            console.error('❌ Failed to save caption changes to database')
            setDbError('Failed to save caption changes')
            return
          }
        }
      } catch (error) {
        console.error('❌ Error saving caption changes:', error)
        setDbError('Failed to save caption changes')
        return
      }
    }
    
    // Exit caption mode after successful save
    setIsInCaptionMode(false)
    setEditingCaptionId(null)
    setTempLoopStart('0:00')
    setTempLoopEnd('0:00')
    
    // Reset original caption snapshot since we're exiting mode
    if (typeof setOriginalCaptionsSnapshot === 'function') {
      setOriginalCaptionsSnapshot(null)
    }
    
    console.log('✅ Caption saved and edit mode exited')
  }

  // Handle canceling caption changes from footer (NEW records: delete, EXISTING records: revert text)
  const handleCancelNewCaption = () => {
    if (editingCaptionId) {
      // Check if this is a NEW record or EXISTING record
      const existingCaption = captions.find(caption => caption.id === editingCaptionId)
      const isNewRecord = !existingCaption || !existingCaption.startTime || !existingCaption.endTime
      
      // Show generic confirmation for both cases
      showCustomAlertModal(
        'Cancelling reverts all changes. Proceed?',
        [
          { 
            text: 'PROCEED', 
            action: async () => {
              try {
                if (isNewRecord) {
                  // NEW RECORD: Delete from database
                  const deleted = await deleteCaption(editingCaptionId, user?.id, setIsLoadingCaptions, setDbError)
                  if (deleted) {
                    // Remove from local state
                    setCaptions(prev => prev.filter(caption => caption.id !== editingCaptionId))
                    console.log('✅ New caption deleted and caption mode exited')
                  }
                } else {
                  // EXISTING RECORD: Revert text changes
                  const originalCaption = originalCaptionsSnapshot?.find(c => c.id === editingCaptionId)
                  if (originalCaption) {
                    setCaptions(prev => prev.map(caption =>
                      caption.id === editingCaptionId 
                        ? { ...caption, line1: originalCaption.line1, line2: originalCaption.line2 }
                        : caption
                    ))
                    console.log('✅ Existing caption text reverted and caption mode exited')
                  }
                }
                
                // Exit caption mode for both cases
                setIsInCaptionMode(false)
                setEditingCaptionId(null)
                
                // Reset footer fields
                setTempLoopStart('0:00')
                setTempLoopEnd('0:00')
                
                // Reset original caption snapshot since we're exiting mode
                if (typeof setOriginalCaptionsSnapshot === 'function') {
                  setOriginalCaptionsSnapshot(null)
                }
                
                // Close the confirmation modal
                hideCustomAlertModal()
              } catch (error) {
                console.error('❌ Error in cancel operation:', error)
                setDbError('Failed to cancel changes')
              }
            }
          },
          { text: 'KEEP EDITING', action: hideCustomAlertModal }
        ]
      )
    } else {
      setIsInCaptionMode(false)
      setEditingCaptionId(null)
    }
  }

  // Handle inline editing from control strip
  const handleInlineEditCaption = (rowNumber) => {
    if (!canAccessLoops()) {
      if (planType === 'freebird') {
        showCustomAlertModal(getAdminMessage('plan_upgrade_message', '🔒 Captions require a paid plan. Please upgrade to access this feature.'), [
          { text: 'UPGRADE PLAN', action: () => window.open('/pricing', '_blank') },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      if (!isVideoFavorited) {
        showCustomAlertModal(getAdminMessage('save_to_favorites_message', '⭐ Please save this video to favorites before editing captions.'), [
          { text: 'SAVE TO FAVORITES', action: () => { hideCustomAlertModal(); handleFavoriteToggle(); } },
          { text: 'OK', action: hideCustomAlertModal }
        ])
        return
      }
      return
    }

    // Check if video is playing
    if (isVideoPlayingFromUtils(player)) {
      showVideoPlayingRestrictionFromUtils({
        getAdminMessage,
        showCustomAlertModal,
        hideCustomAlertModal
      })
      return
    }

    // Check if there are captions to edit
    if (captions.length === 0) {

      return
    }

    // Find current caption at this time
    let currentTime = 0
    if (player && isPlayerReadyFromUtils(player)) {
      try {
        currentTime = Math.floor(player.getCurrentTime())
      } catch (error) {
        console.error('Error getting current time:', error)
      }
    }

    const currentCaption = captions.find(caption => {
      const start = timeToSeconds(caption.startTime)
      const end = timeToSeconds(caption.endTime)
      return currentTime >= start && currentTime <= end
    })

    if (!currentCaption) {
      
      return
    }

    // Enter caption mode for editing
    setIsInCaptionMode(true)
    setEditingCaptionId(currentCaption.id)
    
    // Capture original caption state for potential reversion
    setOriginalCaptionsSnapshot(JSON.parse(JSON.stringify(captions)))
    
    // Update footer fields to control this caption
    setTempLoopStart(currentCaption.startTime)
    setTempLoopEnd(currentCaption.endTime)
    
            // Entering inline edit mode for caption
  }

  // Handle saving captions - NOW PROVIDED BY useCaptionManager HOOK


  // Handle canceling caption editing - NOW PROVIDED BY useCaptionManager HOOK
  /*
  const handleCancelCaptions = () => {
    // Revert all changes back to original state when modal was opened
    if (originalCaptionsSnapshot) {
      setCaptions(JSON.parse(JSON.stringify(originalCaptionsSnapshot)))
              // Reverted captions to original state
    }

    // Clear the snapshot
    setOriginalCaptionsSnapshot(null)

    // Close modal and reset states
    setShowCaptionModal(false)
    setIsAddingNewCaption(false)
    setEditingCaption(null)

            // Caption editing cancelled - all changes reverted
  }
  */

  // Deep comparison utility function for chord captions
  const deepEqualChords = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
  }

  // 🎸 Handle canceling chord caption editing with smart change detection
  const handleCancelChordCaptions = async () => {
    console.log('🎸 SMART CHORD CANCEL - Starting change detection...')
    console.log('🎸 Current chord captions:', chordCaptions)
    console.log('🎸 Original chord blob exists:', !!originalChordCaptionsBlob)

    if (!originalChordCaptionsBlob) {
      console.log('⚠️ No original chord blob found - closing modal without changes')
      setShowChordModal(false)
      return
    }

    // Compare current chord captions with original blob
    const hasChanges = !deepEqualChords(originalChordCaptionsBlob, chordCaptions)
    console.log('🔍 Chord changes detected:', hasChanges)

    if (hasChanges) {
      console.log('⚠️ Chord changes detected - starting delete + restore process...')

      try {
        // Step 1: Delete ALL chord captions for this video from database
        console.log('🗑️ Step 1: Deleting all chord captions from database...')
        const deleteSuccess = await deleteAllChordCaptions(videoId, user?.id, setIsLoadingChords, setDbError)

        if (!deleteSuccess) {
          console.error('❌ Failed to delete chord captions - cannot proceed with cancel')
          setDbError('Failed to cancel changes - please try again')
          return
        }

        // Step 2: Restore chord captions from the original blob
        console.log('🔄 Step 2: Restoring chord captions from original blob...')
        const restoreSuccess = await saveChordCaptions(originalChordCaptionsBlob, videoId, user?.id, setIsLoadingChords, setDbError)

        if (!restoreSuccess) {
          console.error('❌ CRITICAL ERROR: Failed to restore chord captions from blob!')
          setDbError('CRITICAL ERROR: Failed to restore chord captions. Please contact support.')
          return
        }

        // Step 3: Update local state to match restored database state
        console.log('✅ Step 3: Updating local state to match restored database...')
        setChordCaptions(JSON.parse(JSON.stringify(originalChordCaptionsBlob)))

        // Step 4: Clear the blob and close modal
        console.log('🧹 Step 4: Clearing blob and closing modal...')
        setOriginalChordCaptionsBlob(null)
        setShowChordModal(false)

        console.log('🎸 CHORD CAPTIONS CANCELLED WITH REVERT - All changes reverted!')

      } catch (error) {
        console.error('❌ CRITICAL ERROR in handleCancelChordCaptions:', error)
        setDbError('Critical error during cancel operation. Please contact support.')
      }
    } else {
      console.log('✅ No chord changes detected - closing modal silently')
      // No changes made - just close modal without database operations
      setOriginalChordCaptionsBlob(null)
      setShowChordModal(false)
      console.log('🚪 Chord modal closed without revert (no changes made)')
    }
  }

  // Handle duplicate caption - NOW PROVIDED BY useCaptionManager HOOK
  

  // Handle delete caption confirmation - NOW PROVIDED BY useCaptionManager HOOK
  

  // Handle delete all captions - NOW PROVIDED BY useCaptionManager HOOK
  

  // Confirm caption deletion
  const handleConfirmDelete = async () => {
    console.log('🔍 handleConfirmDelete called, captionToDelete:', captionToDelete)
    if (captionToDelete !== null) {
      try {
        const captionToDeleteObj = captions[captionToDelete]
        console.log('🔍 captionToDeleteObj:', captionToDeleteObj)
        if (captionToDeleteObj?.id) {
          console.log('🔍 Calling deleteCaption with ID:', captionToDeleteObj.id)
          const deleted = await deleteCaption(captionToDeleteObj.id, user?.id, setIsLoadingCaptions, setDbError)
          console.log('🔍 deleteCaption result:', deleted)
          if (deleted) {
            const newCaptions = captions.filter((_, i) => i !== captionToDelete)
            setCaptions(newCaptions)
            setCaptionToDelete(null)
            setShowDeleteConfirm(false)
            console.log('✅ Caption deleted successfully')
    
          } else {
            console.error('❌ Failed to delete caption from database')
            setDbError('Failed to delete caption')
          }
        } else {
          // Fallback for captions without database IDs
          const newCaptions = captions.filter((_, i) => i !== captionToDelete)
          setCaptions(newCaptions)
          setCaptionToDelete(null)
          setShowDeleteConfirm(false)
          console.log('✅ Caption removed from local state (no DB ID)')
        }
      } catch (error) {
        console.error('❌ Error deleting caption:', error)
        setDbError('Failed to delete caption')
      }
    } else {
      console.log('❌ captionToDelete is null, nothing to delete')
    }
  }

  // Cancel caption deletion
  const handleCancelDelete = () => {
    setCaptionToDelete(null)
    setShowDeleteConfirm(false)
  }

  // Video flip handler - cycles through 3 states
  const handleFlipVideo = () => {
    // Check daily watch time limits before allowing flip feature
    if (!checkDailyWatchTimeLimits(currentDailyTotal, { returnBoolean: true })) {
              // Flip Video access blocked - daily limit exceeded
      return
    }
    
    switch(flipState) {
      case 'normal':
        setFlipState('horizontal')
        break
      case 'horizontal':
        setFlipState('both')
        break
      case 'both':
        setFlipState('normal')
        break
      default:
        setFlipState('normal')
    }
  }

  // Loop modal handlers - NOW PROVIDED BY LoopManager COMPONENT
  const handleLoopClick = loopManager.handleLoopClick
  

  const handleLoopTimesClick = loopManager.handleLoopTimesClick


  const handleSaveLoop = loopManager.handleSaveLoop
  

  const handleCancelLoop = loopManager.handleCancelLoop
  /*
  const handleCancelLoop_OLD = () => {
    // Just close modal, don't start loop or update times
    setShowLoopModal(false)
            // Loop configuration cancelled
  }
  */

  // Loop timing effect - NOW HANDLED BY LoopManager COMPONENT
  // The LoopManager component includes the useEffect for loop timing



  // Effect to auto-sort captions by start time
  useEffect(() => {
    if (captions.length > 0) {
      const sortedCaptions = [...captions].sort((a, b) => {
        const timeA = timeToSeconds(a.startTime)
        const timeB = timeToSeconds(b.startTime)
        return timeA - timeB
      })
      
      // Only update if order actually changed
      const orderChanged = sortedCaptions.some((caption, index) => caption.id !== captions[index].id)
      if (orderChanged) {
        // Auto-sorting captions by start time
        setCaptions(sortedCaptions)
      }
    }
  }, [captions])

  // Effect to update displayed caption based on video time
  useEffect(() => {
    if (!player || !isPlayerReadyFromUtils(player) || captions.length === 0) return

    const captionUpdateInterval = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime()
        
        // SMART UPDATE: Only force re-render if NOT currently editing inline
        // This prevents the 500ms updates from clearing user input while typing
        if (!isInCaptionMode) {
          // Force re-render to update displayed caption
          setCaptions(prev => [...prev])
        }
      } catch (error) {
        console.error('Caption update error:', error)
      }
    }, 500) // Update every 500ms for smooth caption transitions

    return () => clearInterval(captionUpdateInterval)
  }, [player, captions.length, isInCaptionMode])



  // Effect to load user's default caption duration on component mount
  useEffect(() => {
    if (user?.id) {
      loadUserDefaultCaptionDuration()
    }
  }, [user?.id])

  // Auto-open captions when navigated from watch page
  useEffect(() => {
    if (router.isReady && router.query.openCaptions === 'true') {
      setShowControlStrips(true)
      setShowScrollRow(true)
    }
  }, [router.isReady, router.query.openCaptions])

  // REMOVED: Problematic useEffect that was corrupting caption data
  // This useEffect was bypassing validation and setting invalid times
  // Caption updates now only happen through the SAVE button with proper validation

  // Fullscreen toggle handler
  const handleFullscreenToggle = async () => {
    try {
      if (!isFullscreen) {
        // Enter fullscreen
        const videoContainer = document.getElementById('video-container')
        if (videoContainer) {
          await videoContainer.requestFullscreen()
          setIsFullscreen(true)
          // Entered fullscreen mode
        }
      } else {
        // Exit fullscreen
        if (document.fullscreenElement) {
          await document.exitFullscreen()
          setIsFullscreen(false)
          // Exited fullscreen mode
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (!mounted || (loading && !router.isReady)) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    )
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* Full-Screen Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/gt_splashBG_1200_dark1.png')`,
          width: '100%',
          height: '100%',
          minWidth: '100vw',
          minHeight: '100vh'
        }}
      />

      {/* 75% Black Overlay */}
      <div className="absolute inset-0 bg-black/60 z-0" />

      {/* Page Type Indicator for Specialized Pages */}
      {pageType !== 'default' && (
        <div className="fixed top-20 right-4 z-50 bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
          {pageType.toUpperCase().replace('-', ' + ')}
        </div>
      )}
      
      {/* Top Banner - Admin controlled */}
      <TopBanner />
      
      {/* Header Component with Search Functionality */}
      <Header 
        showBrainIcon={false}
        showSearchIcon={false}
        logoImage="/images/gt_logoM_PlayButton.png"
        // Search functionality
        showSearchBar={true}
        showFavoritesToggle={false}
        showResumeButton={false}
        showSortDropdown={false}
        // Search state
        searchQuery={searchQuery}
        sortOrder="relevance"
        showFavoritesOnly={false}
        savedSession={null}
        // Event handlers
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onFavoritesToggle={() => router.push('/search?show_favorites=true')}
        onResumeClick={() => {}}
        onSortChange={() => {}}
        // Standard props
        onAuthClick={handleAuthClick}
        onMenuClick={() => setShowMenuModal(true)}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Content Area - Theatre Mode Layout with Dynamic Height */}
      <div className="relative z-10 overflow-hidden px-6 mt-20" style={{
        height: showControlStrips ? `calc(100vh - ${160 + (showScrollRow ? 356 : 0)}px)` : 'calc(100vh - 155px)',
        transition: 'height 0.3s ease-in-out'
      }}>
        {/* Video Player Container - Edge-to-Edge Width with Dynamic Height */}
        <div id="video-container" data-testid="video-container" className="w-full max-w-none h-full flex items-center justify-center">
          {/* YouTube Video Player - Embedded API (matching watch_ORIG4.js) */}
          {videoId && (
            <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-2xl">
              {/* Video Container - Dynamic height based on available space with flip transformations */}
              <div
                className="relative w-full h-full transition-transform duration-300"
                style={{
                  // Critical styles from deployed version
                  height: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  // Handle video flip transformations
                  transform: flipState === 'horizontal'
                    ? 'scaleX(-1)'
                    : flipState === 'vertical'
                    ? 'scaleY(-1)'
                    : flipState === 'both'
                    ? 'scaleX(-1) scaleY(-1)'
                    : 'none'
                }}
              >
                {/* YouTube API Player - Restored for full controls */}
                <div id="youtube-player" className="w-full h-full" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STICKY CONTROL STRIPS FOOTER - MODIFIED FOR SCROLLING VERSION */}
      {showControlStrips && (
        <div className="fixed bottom-16 left-0 right-0 z-40 h-[356px] bg-transparent px-4 md:px-6">
          {/* Control Strips Container - Single Row for Scrolling Content */}
          <div className="h-full relative">

            {/* Single Scrolling Row - Split into Chord SVGs (Left) and Scrolling Lyrics (Right) */}
            {showScrollRow && (
              <div className="absolute bottom-0 left-0 right-0 flex border-2 border-white rounded-lg overflow-hidden h-full transition-all duration-300">
                {/* Left Half - 3x2 Grid of Chord SVGs */}
                <div className="w-1/2 h-full p-2 bg-black/80 border-r border-white relative">
                  <div className="h-full grid grid-cols-3 grid-rows-2 gap-1">
                    {(() => {
                      // Get current chord captions based on video time
                      const currentChords = chordCaptions.filter(chord => {
                        const start = parseTimeToSeconds(chord.start_time)
                        const end = parseTimeToSeconds(chord.end_time)
                        return currentTimeSeconds >= start && currentTimeSeconds <= end
                      }).slice(0, 6) // Limit to 6 chords for 3x2 grid

                      // Fill remaining slots with empty placeholders
                      const gridItems = [...currentChords]
                      while (gridItems.length < 6) {
                        gridItems.push(null)
                      }

                      return gridItems.map((chord, index) => (
                        <div key={index} className="bg-black rounded flex items-center justify-center overflow-hidden">
                          {chord && chord.chord_position ? (
                            <img
                              src={chord.chord_position.aws_svg_url_dark || chord.chord_position.aws_svg_url_light}
                              alt={chord.chord_position.chord_position_full_name || chord.chord_name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Fallback to light version if dark fails
                                if (e.target.src !== chord.chord_position.aws_svg_url_light) {
                                  e.target.src = chord.chord_position.aws_svg_url_light
                                } else {
                                  // Show chord name as text fallback
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'block'
                                }
                              }}
                            />
                          ) : (
                            <span className="text-gray-500 text-xs text-center">
                              {chord ? chord.chord_name : ''}
                            </span>
                          )}
                          {chord && (
                            <span className="text-white text-xs text-center hidden">
                              {chord.chord_name}
                            </span>
                          )}
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Loading/Error States */}
                  {isLoadingChordCaptions && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-sm">Loading chords...</span>
                    </div>
                  )}

                  {chordCaptionsError && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-red-400 text-sm">{chordCaptionsError}</span>
                    </div>
                  )}

                  {/* Paint Brush Icon - Lower Right Corner */}
                  <button
                    onClick={() => setShowChordModal(true)}
                    className="absolute bottom-2 right-2 p-2 text-white hover:bg-white/10 rounded-lg transition-colors duration-300"
                    title="Edit Chord Captions"
                  >
                    <PiPaintBrushBroadFill className="w-6 h-6" />
                  </button>
                </div>

                {/* Right Half - Scrollable Lyrics - FULL WIDTH/HEIGHT */}
                <div className="w-1/2 h-full bg-black/80 overflow-hidden">
                  <SongContentScroller
                    content={songContent}
                    isLoading={isLoadingSongContent}
                    error={lyricsError}
                    currentTime={currentTimeSeconds}
                    onRetry={loadSongContent}
                    player={player}
                    videoId={videoId}
                    userId={user?.id}
                  />
                </div>
              </div>
            )}





          </div>
        </div>
      )}

      {/* PERMANENT FOOTER CONTROL AREA - NEVER DISAPPEARS */}
      <WatchFooter
        // Video controls
        flipState={flipState}
        handleFlipVideo={handleFlipVideo}

        // Loop/Caption controls
        isInCaptionMode={isInCaptionMode}
        handleLoopClick={handleLoopClick}
        isLoopActive={isLoopActive}

        // Caption timing
        tempLoopStart={tempLoopStart}
        tempLoopEnd={tempLoopEnd}
        handleSaveNewCaption={handleSaveNewCaption}
        handleCancelNewCaption={handleCancelNewCaption}

        // Loop timing
        loopStartTime={loopStartTime}
        loopEndTime={loopEndTime}
        handleLoopTimesClick={handleLoopTimesClick}

        // Favorites
        isVideoFavorited={isVideoFavorited}
        handleFavoriteToggle={handleFavoriteToggle}

        // Control strips
        showControlStrips={showControlStrips}
        handleControlStripsToggle={handleControlStripsToggle}

        // Layout selection
        setShowLayoutModal={setShowLayoutModal}

        // Fullscreen
        isFullscreen={isFullscreen}
        handleFullscreenToggle={handleFullscreenToggle}

        // Page type for icon colors
        pageType="watch_s"

        // Navigation functions
        onNavigateToWatchPage={() => {
          const currentQuery = router.query
          const queryString = new URLSearchParams({
            v: currentQuery.v,
            ...(currentQuery.title && { title: currentQuery.title }),
            ...(currentQuery.channel && { channel: currentQuery.channel }),
            openCaptions: 'true' // Auto-open captions
          }).toString()
          router.push(`/watch?${queryString}`)
        }}
      />



      {/* Unfavorite Warning Modal */}
      {showUnfavoriteWarning && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUnfavoriteWarning(false)
            }
          }}
        >
          <div className="bg-black rounded-2xl shadow-2xl max-w-sm w-full relative text-white p-6">
            {/* Modal Content */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-4">⚠️ Remove from Favorites?</h2>
              <p className="text-gray-300 text-sm">
                Removing this favorite will also delete all user entered meta-data. This action cannot be undone. Proceed?
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleUnfavoriteCancel}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleUnfavoriteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                PROCEED
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Limit Upgrade Modal */}
      {showUpgradeModal && dailyLimitInfo && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUpgradeModal(false)
            }
          }}
        >
          <div className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white p-6">
            {/* Modal Content */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-4 text-red-400">⏰ Daily Limit Exceeded</h2>
              <p className="text-gray-300 text-sm mb-4">
                Sorry, you've exceeded your <span className="font-semibold text-blue-400">{dailyLimitInfo.planType.toUpperCase()}</span> plan daily watch limit.
              </p>
              <div className="bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-300">
                  <span className="text-red-400">Used:</span> {dailyLimitInfo.dailyMinutes} minutes
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-green-400">Limit:</span> {dailyLimitInfo.userLimit} minutes
                </p>
              </div>
              <p className="text-gray-300 text-xs">
                Your daily limit resets at midnight. Upgrade your plan for more watch time!
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowUpgradeModal(false)
                  router.push('/pricing')
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                UPGRADE PLAN
              </button>
              <button
                onClick={() => {
                  setShowUpgradeModal(false)
                  router.push('/')
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                GO HOME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        handleCancelDelete={handleCancelDelete}
        handleConfirmDelete={handleConfirmDelete}
      />

      {/* Caption Editor Modal */}
      <CaptionEditorModal
        showCaptionModal={showCaptionModal}
        editingCaption={editingCaption}
        captions={captions}
        setCaptions={setCaptions}
        conflictRowIndex={conflictRowIndex}
        userDefaultCaptionDuration={userDefaultCaptionDuration}
        setUserDefaultCaptionDuration={setUserDefaultCaptionDuration}
        handleCancelCaptions={handleCancelCaptions}
        handleAddCaptionFromTimeline={handleAddCaptionFromTimeline}
        handleDeleteAllCaptions={() => handleDeleteAllCaptions(showCustomAlertModal, hideCustomAlertModal, deleteCaption, user, setIsLoadingCaptions, setDbError)}
        handleSaveCaptions={handleSaveCaptions}
        handleDuplicateCaption={handleDuplicateCaptionWrapper}
        handleDeleteCaption={handleDeleteCaption}
        player={player}
        isPlayerReady={isPlayerReadyFromUtils}
        saveUserDefaultCaptionDuration={saveUserDefaultCaptionDuration}
        originalCaptionsSnapshot={originalCaptionsSnapshot}
        showCustomAlertModal={showCustomAlertModal}
        hideCustomAlertModal={hideCustomAlertModal}
        onLocalStateChange={(newLocalCaptions) => {
          // IS THIS NEEDED???
          // This callback allows the modal to update its local state
          // when captions are added/removed from the parent
        }}
      />

      {/* New Caption Placement Dialog */}
      {showAddCaptionDialog && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddCaptionDialog(false)
              setSelectedSerialNumber(null)
            }
          }}
        >
          <div className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white p-6">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowAddCaptionDialog(false)
                setSelectedSerialNumber(null)
              }}
              className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors text-2xl font-bold"
            >
              ×
            </button>
            
            {/* Modal Content */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-4">Add New Caption</h2>
            </div>
            
            {/* Serial Number Selection */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-gray-300 text-sm">
                  Add new Caption after Caption #:
                </span>
                
                <select
                  value={selectedSerialNumber || ''}
                  onChange={(e) => setSelectedSerialNumber(parseInt(e.target.value))}
                  className="px-3 py-2 text-sm bg-white/20 text-white border border-white/30 rounded focus:border-blue-400 focus:outline-none w-20"
                >
                  <option value="">#</option>
                  {captions.map((caption) => (
                    <option key={caption.serial_number} value={caption.serial_number}>
                      {caption.serial_number}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Help Text */}
              <div className="text-xs text-gray-400 text-center">
                {selectedSerialNumber && (
                  <div>
                    {selectedSerialNumber === Math.max(...captions.map(c => c.serial_number)) ? (
                      <span>New caption will be added after the last caption with {userDefaultCaptionDuration || 10} seconds duration.</span>
                    ) : (
                      <span>New caption will be inserted between existing captions, splitting the selected caption in half.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleAddCaptionAtPosition}
                disabled={!selectedSerialNumber}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedSerialNumber 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                ADD
              </button>
              
              <button
                onClick={() => {
                  setShowAddCaptionDialog(false)
                  setSelectedSerialNumber(null)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <LoopConfigModal
        showLoopModal={showLoopModal}
        setShowLoopModal={setShowLoopModal}
        isLoopActive={isLoopActive}
        tempLoopStart={tempLoopStart}
        tempLoopEnd={tempLoopEnd}
        setTempLoopStart={setTempLoopStart}
        setTempLoopEnd={setTempLoopEnd}
        handleCancelLoop={handleCancelLoop}
        handleSaveLoop={handleSaveLoop}
      />

      <CustomAlertModal
        showCustomAlert={showCustomAlert}
        customAlertMessage={customAlertMessage}
        customAlertButtons={customAlertButtons}
      />

      {/* Chord Caption Modal */}
      <ChordCaptionModal
        showChordModal={showChordModal}
        setShowChordModal={setShowChordModal}
        videoId={videoId}
        videoDurationSeconds={player ? player.getDuration() : 0}
        currentTimeSeconds={player ? player.getCurrentTime() : 0}
        onChordsUpdated={(chordData) => {
          // Handle chord updates - reload chord captions if needed
          console.log('✅ Chord captions updated')

          // Reload chord captions for the SVG display
          if (chordData && chordData.length > 0) {
            setChordCaptions(chordData)
          }
        }}
        userId={user?.id}
        onCancel={() => setShowChordModal(false)}
      />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
      
      {/* Support Modal */}
      <SupportModal 
        isOpen={showSupportModal} 
        onClose={() => setShowSupportModal(false)} 
      />

      {/* Menu Modal */}
      <MenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        onSupportClick={() => setShowSupportModal(true)}
      />

      {/* Layout Selection Modal - COMMENTED OUT - Only using watch.js and watch_s.js pages now */}
      {/*
      <LayoutSelectionModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        currentLayout={currentLayout}
        onLayoutSelect={(layoutId) => {
          setCurrentLayout(layoutId)
          console.log(`🎨 Layout selected: ${layoutId}`)

          // Navigate to appropriate layout page
          const currentQuery = router.query
          const baseUrl = `/watch-${layoutId}`
          const queryString = new URLSearchParams({
            v: currentQuery.v,
            ...(currentQuery.title && { title: currentQuery.title }),
            ...(currentQuery.channel && { channel: currentQuery.channel })
          }).toString()

          router.push(`${baseUrl}?${queryString}`)
        }}
      />
      */}
    </div>
  )
}