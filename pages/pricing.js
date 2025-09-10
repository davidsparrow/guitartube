// pages/pricing.js - Dynamic Pricing Page with Feature Gates Integration
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/AuthModal'
import MenuModal from '../components/MenuModal'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useRouter } from 'next/router'
import { FaRegCreditCard } from "react-icons/fa"
import { GiChickenOven, GiGuitar } from "react-icons/gi"
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '../lib/supabase/client'
export default function Home() {
  const { isAuthenticated, user, profile, loading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isAnnualBilling, setIsAnnualBilling] = useState(true) // Default to annual billing
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const searchInputRef = useRef(null)
  const router = useRouter()

  // Stripe initialization
  const [stripe, setStripe] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const footerRef = useRef()

  // Feature Gates for dynamic pricing limits
  const [featureGates, setFeatureGates] = useState(null)
  const [featureGatesLoading, setFeatureGatesLoading] = useState(true)

  // Testimonial Carousel
  const [currentCarouselPage, setCurrentCarouselPage] = useState(0)
  
  // Load feature gates for dynamic pricing limits
  const loadFeatureGates = async () => {
    try {
      setFeatureGatesLoading(true)

      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'feature_gates')
        .single()

      if (error) {
        console.error('❌ Error loading feature gates for pricing:', error)
        // Set fallback values
        setFeatureGates({
          daily_search_limits: { freebird: 8, roadie: 24, hero: 100 },
          daily_watch_time_limits: { freebird: 60, roadie: 180, hero: 480 },
          favorite_limits: { freebird: 0, roadie: 12, hero: -1 }
        })
        return
      }

      if (data && data.setting_value) {
        setFeatureGates(data.setting_value)
        console.log('✅ Feature gates loaded for pricing:', data.setting_value)
      } else {
        // Set fallback values
        setFeatureGates({
          daily_search_limits: { freebird: 8, roadie: 24, hero: 100 },
          daily_watch_time_limits: { freebird: 60, roadie: 180, hero: 480 },
          favorite_limits: { freebird: 0, roadie: 12, hero: -1 }
        })
      }
    } catch (error) {
      console.error('❌ Error in loadFeatureGates for pricing:', error)
      // Set fallback values
      setFeatureGates({
        daily_search_limits: { freebird: 8, roadie: 24, hero: 100 },
        daily_watch_time_limits: { freebird: 60, roadie: 180, hero: 480 },
        favorite_limits: { freebird: 0, roadie: 12, hero: -1 }
      })
    } finally {
      setFeatureGatesLoading(false)
    }
  }

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true)

    // Load feature gates
    loadFeatureGates()

    // Initialize Stripe
    const initStripe = async () => {
      console.log('🔄 Initializing Stripe...')
      console.log('📝 Stripe Key exists:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      console.log('🔑 Stripe Key (first 10 chars):', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 10))

      try {
        const stripeInstance = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        console.log('✅ Stripe loaded successfully:', !!stripeInstance)
        setStripe(stripeInstance)
      } catch (error) {
        console.error('❌ Stripe loading failed:', error)
      }
    }

    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      console.log('🚀 Starting Stripe initialization...')
      initStripe()
    } else {
      console.warn('⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found')
    }
  }, [])

  // Auto-advance carousel every 20 seconds
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      setCurrentCarouselPage((prevPage) => (prevPage + 1) % 3)
    }, 20000) // 20 seconds

    return () => clearInterval(interval)
  }, [mounted])

  // Helper functions to format limits for display
  const formatSearchLimit = (tier) => {
    if (!featureGates?.daily_search_limits) return 'Loading...'
    const limit = featureGates.daily_search_limits[tier]
    return limit.toString() // Show exact numbers from DB
  }

  const formatWatchTimeLimit = (tier) => {
    if (!featureGates?.daily_watch_time_limits) return 'Loading...'
    const minutes = featureGates.daily_watch_time_limits[tier]
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours >= 8) return `${hours} Hrs.`
    if (remainingMinutes === 0) return `${hours} Hr${hours !== 1 ? 's' : ''}.`
    return `${hours}h ${remainingMinutes}m`
  }

  const formatFavoriteLimit = (tier) => {
    if (!featureGates?.favorite_limits) return 'Loading...'
    const limit = featureGates.favorite_limits[tier]
    return limit === -1 ? 'UNLIMITED' : limit.toString() // Show UNLIMITED only for -1
  }

  // REMOVED: Smart redirect logic for authenticated users
  // Users need to be able to access the pricing page to select plans!

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

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    if (searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.setSelectionRange(0, 0)
    }
  }

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) return
    // Navigate to search page with query
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  // Handle search button click
  const handleSearchClick = () => {
    handleSearch()
  }

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Handle Stripe checkout
  const handleCheckout = async (plan) => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (!stripe) {
      console.error('Stripe not initialized')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan,
          billingCycle: isAnnualBilling ? 'annual' : 'monthly',
          userEmail: user.email,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        // Handle errors (like duplicate subscription)
        if (data.message === 'You already have an active subscription') {
          alert(`You already have an active ${data.currentPlan} subscription.`)
        } else {
          alert('Failed to create checkout session. Please try again.')
        }
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle free plan selection (no Stripe needed)
  const handleFreePlanSelection = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    // ✅ Use AuthContext to check existing subscription (no API call needed)
    if (profile?.subscription_tier && profile?.subscription_tier !== 'freebird') {
      alert(`You already have a ${profile.subscription_tier} plan. Contact support to downgrade.`)
      return
    }
    
    if (profile?.subscription_tier === 'freebird') {
      alert('You\'re already on the Freebird plan!')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: 'freebird',
          billingCycle: 'none', // Free plans don't have billing cycles
          userEmail: user.email,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Successfully updated to free plan
        alert('Welcome to the Freebird plan! You can now enjoy basic features.')
        // Optionally redirect to search page or refresh the page
        router.push('/search')
      } else {
        alert('Failed to update plan. Please try again.')
      }
    } catch (error) {
      console.error('Free plan selection error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
      {/* Full-Screen Background - NEW DARK IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
        style={{
          backgroundImage: `url('/images/gt_splashBG_1200_dark22.png')`,
          width: '100%',
          height: '100%',
          minWidth: '100vw',
          minHeight: '100vh',
        }}
      />
      {/* 50% Dark Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-60 hidden md:block"
        style={{
          width: '100%',
          height: '100%',
          minWidth: '100vw',
          minHeight: '100vh',
        }}
      />
      {/* Header Component */}
      <Header 
        showBrainIcon={true}
        showSearchIcon={false}
        onAuthClick={handleAuthClick}
        onMenuClick={() => setShowMenuModal(true)}
        isAuthenticated={isAuthenticated}
      />
      {/* Main Content - Pricing */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 mt-16 md:mt-20" style={{ 
        height: 'calc(100vh - 120px)',
        backgroundColor: 'transparent'
      }}>
        <div className="max-w-4xl w-full rounded-2xl p-8 text-white overflow-y-auto max-h-full pb-24" style={{ 
          fontFamily: 'Poppins, sans-serif',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent'
        }}>
          <h1 className="text-2xl md:text-4xl font-bold text-center mb-2 text-yellow-400">Choose Your Plan</h1>
          <p className="text-center text-white font-bold text-l mb-11" style={{ fontFamily: 'Futura, sans-serif' }}>Subscriptions are like Guitars. New ones all the time.</p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8 space-x-4">
            <span className={`text-sm font-medium ${isAnnualBilling ? 'text-gray-500' : 'text-orange-400'}`}>
              Billed Monthly
            </span>
            <button
              onClick={() => setIsAnnualBilling(!isAnnualBilling)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isAnnualBilling ? 'bg-blue-600' : 'bg-orange-500'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnualBilling ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${!isAnnualBilling ? 'text-gray-500' : 'text-blue-400'}`}>
              Billed Annually
            </span>
          </div>
          
          {/* Pricing Tiers */}
          <div className="flex flex-col md:grid md:grid-cols-3 gap-6 space-y-5 md:space-y-0">
            {/* Freebird */}
            <div className="border border-white/60 rounded-xl p-6 pb-9 relative bg-black/75">

              {/* Plan Icon - Upper Right */}
              <div className="absolute top-4 right-4">
                <img
                  src="/images/plan_icon_freebird.png"
                  alt="Freebird Plan Icon"
                  className="w-12 h-12 filter brightness-0 invert"
                />
              </div>

              {/* No Credit Card Pill - Bottom Edge Overlap - Made Wider */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-7 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                No credit card
              </div>
              <div className="mb-6 mt-2">
                <div className="mt-1">
                  <h3 className="text-2xl font-bold text-left">Freebird</h3>
                  <div className="text-gray-400 font-bold text-base">100% Free</div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Flippin some vids</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <span className="mr-3">✗</span>
                  <span>Loopin some segments</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <span className="mr-3">✗</span>
                  <span>Login Resume</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <span className="mr-3">✗</span>
                  <span>Captions & Chords</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <span className="mr-3">✗</span>
                  <span>Tabs (coming soon)</span>
                </div>
              </div>
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <div>max faves: <span className="text-white">{formatFavoriteLimit('freebird')}</span></div>
                <div>max daily searches: <span className="text-white">{formatSearchLimit('freebird')}</span></div>
                <div>max daily watch time: <span className="text-white">{formatWatchTimeLimit('freebird')}</span></div>
              </div>
              <button 
                onClick={handleFreePlanSelection}
                disabled={isLoading}
                className="w-full mt-6 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <span>STAY FREE</span>
                    <img 
                      src="/images/no_credit_card2.png" 
                      alt="No Credit Card" 
                      className="w-5 h-5"
                    />
                  </>
                )}
              </button>
            </div>

            {/* Roadie */}
            <div className="border border-orange-500 rounded-xl p-6 pb-9 relative bg-black/75">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>

              {/* Plan Icon - Upper Right */}
              <div className="absolute top-4 right-4">
                <img
                  src="/images/plan_icon_roadie.png"
                  alt="Roadie Plan Icon"
                  className="w-12 h-12"
                  style={{ filter: 'hue-rotate(45deg) saturate(200%) brightness(1.6)' }}
                />
              </div>

              {/* 30-day Trial Pill - Bottom Edge Overlap - Made Wider */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-7 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                30-day Free Trial
              </div>
              <div className="mb-6 mt-2">
                <div className="mt-1">
                  <h3 className="text-2xl font-bold text-left">Roadie</h3>
                  <div className="text-orange-400 font-bold text-base">
                    ${isAnnualBilling ? '8' : '10'}/mo.
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Everything in Freebird</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Loopin some segments</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Login Resume</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Custom 2-Line Captions</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <span className="mr-3">✗</span>
                  <span>Captioned Chord Diagrams</span>
                </div>
              </div>
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <div>max faves: <span className="text-orange-400">{formatFavoriteLimit('roadie')}</span></div>
                <div>max daily searches: <span className="text-orange-400">{formatSearchLimit('roadie')}</span></div>
                <div>max daily watch time: <span className="text-orange-400">{formatWatchTimeLimit('roadie')}</span></div>
              </div>
              
              <button
                onClick={() => handleCheckout('roadie')}
                disabled={isLoading}
                className="w-full mt-6 bg-orange-500 text-black py-3 rounded-lg hover:bg-orange-400 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'STAY CHEAP'
                )}
              </button>
            </div>

            {/* Hero */}
            <div className="border rounded-xl p-6 pb-9 relative bg-black/75" style={{ borderColor: '#8dc641' }}>
              {/* Plan Icon - Upper Right */}
              <div className="absolute top-4 right-4">
                <img
                  src="/images/plan_icon_hero.png"
                  alt="Hero Plan Icon"
                  className="w-14 h-14"
                  style={{ filter: 'brightness(0.8)' }}
                />
              </div>

              {/* 30-day Trial Pill - Bottom Edge Overlap - Made Wider */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-7 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                30-day Free Trial
              </div>
              <div className="mb-6 mt-2">
                <div className="mt-1">
                  <h3 className="text-2xl font-bold text-left">Hero</h3>
                  <div className="font-bold text-base" style={{ color: '#8dc641' }}>
                    ${isAnnualBilling ? '16' : '19'}/mo.
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Everything in Roadie</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Captioned Chord Diagrams</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Auto-Gen Chord Diagrams</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Auto-Gen Tabs</span>
                </div>
                <div className="flex items-center">
                  <span className="text-black mr-3">-</span>
                  <span className="text-black">-</span>
                </div>
              </div>
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <div>max faves: <span style={{ color: '#8dc641' }}>{formatFavoriteLimit('hero')}</span></div>
                <div>max daily searches: <span style={{ color: '#8dc641' }}>{formatSearchLimit('hero')}</span></div>
                <div>max daily watch time: <span style={{ color: '#8dc641' }}>{formatWatchTimeLimit('hero')}</span></div>
              </div>
              
              <button 
                onClick={() => handleCheckout('hero')}
                disabled={isLoading}
                className="w-full mt-6 text-black py-3 rounded-lg transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ backgroundColor: '#8dc641' }}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'GO BROKE'
                )}
              </button>
            </div>
          </div>

          {/* Testimonial Carousel */}
          <div className="mt-20">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-yellow-400">What Our Users Say</h2>

            {/* Carousel Container */}
            <div className="relative">
              {/* Review Cards - Page 1 of 3 */}
              {currentCarouselPage === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Review Card 1 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "The pricing is so reasonable! Finally found a guitar learning platform that doesn't break the bank."
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Marcus T.</p>
                    </div>
                  </div>

                  {/* Review Card 2 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "Love that I can start free and upgrade when I'm ready. No pressure, just great value!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Jennifer K.</p>
                    </div>
                  </div>

                  {/* Review Card 3 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "The Hero plan gives me everything I need. Worth every penny for unlimited access!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Carlos R.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Cards - Page 2 of 3 */}
              {currentCarouselPage === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Review Card 4 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "The annual billing discount is amazing! Saved me $48 this year on my Roadie plan."
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Amanda S.</p>
                    </div>
                  </div>

                  {/* Review Card 5 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "Transparent pricing with no hidden fees. What you see is what you pay - refreshing!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Robert H.</p>
                    </div>
                  </div>

                  {/* Review Card 6 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "The 30-day free trial convinced me. Now I'm a happy Hero subscriber!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Michelle C.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Cards - Page 3 of 3 */}
              {currentCarouselPage === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Review Card 7 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "Best value for money in guitar learning. The features you get for the price are unbeatable!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Kevin H.</p>
                    </div>
                  </div>

                  {/* Review Card 8 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "Flexible plans that grow with you. Started free, now on Roadie, considering Hero!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Diana M.</p>
                    </div>
                  </div>

                  {/* Review Card 9 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "Fair pricing for premium features. GuitarTube delivers exactly what they promise!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Steven L.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Carousel Navigation - Hidden on Mobile */}
              <div className="hidden md:flex justify-center mt-4 space-x-2">
                <button
                  onClick={() => setCurrentCarouselPage(0)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    currentCarouselPage === 0 ? 'bg-yellow-400' : 'bg-white/30'
                  }`}
                />
                <button
                  onClick={() => setCurrentCarouselPage(1)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    currentCarouselPage === 1 ? 'bg-yellow-400' : 'bg-white/30'
                  }`}
                />
                <button
                  onClick={() => setCurrentCarouselPage(2)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    currentCarouselPage === 2 ? 'bg-yellow-400' : 'bg-white/30'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Footer Component */}
      <Footer ref={footerRef} />
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      

      {/* Menu Modal */}
      <MenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        onSupportClick={() => footerRef.current?.openSupportModal()}
      />
      

      

    </div>
  )
}