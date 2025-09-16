// pages/welcome.js - Welcome Page After Signup
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../contexts/UserContext'
import AuthModal from '../components/AuthModal'
import MenuModal from '../components/MenuModal'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useRouter } from 'next/router'

export default function Welcome() {
  const { isAuthenticated, user, profile, loading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const footerRef = useRef()
  const router = useRouter()

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Handle go to search
  const handleGoToSearch = () => {
    router.push('/search')
  }

  if (!mounted || (loading && !router.isReady)) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    )
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black" style={{ 
      backgroundColor: '#000000',
      minHeight: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/gt_splashBG_dark.png')`,
          width: '100%',
          height: '100%'
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />

      {/* Header */}
      <Header 
        isAuthenticated={isAuthenticated}
        onAuthClick={handleAuthClick}
        onMenuClick={() => setShowMenuModal(true)}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Welcome Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Welcome to <span className="text-yellow-400">GuitarTube</span>!
          </h1>
          
          {/* Welcome Video */}
          <div className="bg-gray-800/30 rounded-lg p-6 mb-8">
            <div className="aspect-video rounded-lg mb-4 overflow-hidden">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/ytRyZUfZHEo?si=VhoOf-amlh7xZ2tf" 
                title="GuitarTube Platform Demo" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerPolicy="strict-origin-when-cross-origin" 
                allowFullScreen
                className="w-full h-full rounded-lg"
              ></iframe>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">Platform Demo</h3>
            <p className="text-gray-300">Learn how to get the most out of GuitarTube</p>
          </div>

          {/* Go to Search Button */}
          <button
            onClick={handleGoToSearch}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-lg text-xl transition-colors duration-300 shadow-lg"
          >
            Start Searching Videos →
          </button>

          {/* User Info */}
          {isAuthenticated && profile && (
            <div className="mt-8 text-gray-300">
              <p>Welcome, {profile.full_name || user.email}!</p>
              <p className="text-sm">You're on the <span className="text-yellow-400 font-semibold">{profile.subscription_tier || 'freebird'}</span> plan</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer ref={footerRef} />

      {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showMenuModal && (
        <MenuModal 
          onClose={() => setShowMenuModal(false)}
        />
      )}
    </div>
  )
}
