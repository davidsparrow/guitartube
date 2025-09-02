// pages/watch-lyrics.js - Lyrics-focused watch page (TEST)
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../contexts/UserContext'
import WatchPageLayout from '../components/watch/WatchPageLayout'
import VideoContainer from '../components/watch/VideoContainer'
import WatchControls from '../components/watch/WatchControls'
import AuthModal from '../components/AuthModal'
import MenuModal from '../components/MenuModal'
import SupportModal from '../components/SupportModal'

export default function WatchLyrics() {
  const { isAuthenticated, user } = useAuth()
  const { profile } = useUser()
  const router = useRouter()
  
  // Basic states
  const [mounted, setMounted] = useState(false)
  const [videoId, setVideoId] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoChannel, setVideoChannel] = useState('')
  const [isVideoReady, setIsVideoReady] = useState(false)
  
  // UI states
  const [flipState, setFlipState] = useState('normal')
  const [showControlStrips, setShowControlStrips] = useState(false)
  const [isVideoFavorited, setIsVideoFavorited] = useState(false)
  
  // Modal states
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Mount effect
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load video from URL
  useEffect(() => {
    if (mounted && router.isReady) {
      const { v, title, channel } = router.query
      if (v && typeof v === 'string') {
        setVideoId(v)
        setVideoTitle(title ? decodeURIComponent(title) : '')
        setVideoChannel(channel ? decodeURIComponent(channel) : '')
        setIsVideoReady(true)
        console.log('🎵 Lyrics-focused watch page loaded:', v)
      } else {
        router.push('/')
      }
    }
  }, [mounted, router.isReady, router.query])

  // Event handlers
  const handleFlipVideo = () => {
    setFlipState(prev => {
      switch(prev) {
        case 'normal': return 'horizontal'
        case 'horizontal': return 'both'
        case 'both': return 'normal'
        default: return 'normal'
      }
    })
  }

  const handleControlStripsToggle = () => {
    setShowControlStrips(prev => !prev)
  }

  const handleFavoriteToggle = () => {
    setIsVideoFavorited(prev => !prev)
  }

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleAuthClick = () => {
    setShowAuthModal(true)
  }

  const handleVideoReady = (event, player) => {
    console.log('✅ Video ready in lyrics page')
  }

  const handleVideoError = (error) => {
    console.error('❌ Video error in lyrics page:', error)
  }

  if (!mounted) {
    return <div className="min-h-screen bg-black" />
  }

  return (
    <WatchPageLayout
      pageType="lyrics"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
      onAuthClick={handleAuthClick}
      onMenuClick={() => setShowMenuModal(true)}
      isAuthenticated={isAuthenticated}
      router={router}
    >
      {/* Video Container */}
      <VideoContainer
        videoId={videoId}
        videoTitle={videoTitle}
        flipState={flipState}
        showControlStrips={showControlStrips}
        onVideoReady={handleVideoReady}
        onVideoError={handleVideoError}
      />

      {/* Lyrics-specific content area */}
      {showControlStrips && (
        <div className="fixed bottom-16 left-0 right-0 z-40 h-32 bg-black/80 backdrop-blur-sm border-t border-white/20 px-6">
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-2xl mb-2">🎵</div>
              <div className="text-lg font-semibold">Lyrics Display</div>
              <div className="text-sm text-gray-300">Text captions will appear here</div>
            </div>
          </div>
        </div>
      )}

      {/* Watch Controls */}
      <WatchControls
        flipState={flipState}
        onFlipVideo={handleFlipVideo}
        showControlStrips={showControlStrips}
        onControlStripsToggle={handleControlStripsToggle}
        isVideoFavorited={isVideoFavorited}
        onFavoriteToggle={handleFavoriteToggle}
        loopStartTime="0:00"
        loopEndTime="0:00"
        onLoopClick={() => console.log('Loop clicked')}
        onLoopTimesClick={() => console.log('Loop times clicked')}
      />

      {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
      
      <SupportModal 
        isOpen={showSupportModal} 
        onClose={() => setShowSupportModal(false)} 
      />

      <MenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        onSupportClick={() => setShowSupportModal(true)}
      />
    </WatchPageLayout>
  )
}
