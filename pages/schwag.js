// pages/pricing.js - Dynamic Pricing Page with Feature Gates Integration
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/AuthModal'
import MenuModal from '../components/MenuModal'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useRouter } from 'next/router'
export default function Home() {
  const { isAuthenticated, user, loading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const searchInputRef = useRef(null)
  const router = useRouter()

  const footerRef = useRef()


  // Testimonial Carousel
  const [currentCarouselPage, setCurrentCarouselPage] = useState(0)
  

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-advance carousel every 20 seconds
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      setCurrentCarouselPage((prevPage) => (prevPage + 1) % 3)
    }, 20000) // 20 seconds

    return () => clearInterval(interval)
  }, [mounted])


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
          backgroundImage: `url('/images/gt_splashBG4_1200_dark1.png')`,
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
          <h1 className="text-2xl md:text-4xl font-bold text-center mb-2 text-yellow-400">Be the Hero you always knew you could be!</h1>
          <p className="text-center text-white font-bold text-l mb-11" style={{ fontFamily: 'Futura, sans-serif' }}>But do it in comfort instead of in a towel that the dog peed on. Show your colors and get noticed. Don't be last one on your block to get some.</p>
          
          
          {/* T-Shirt Collection */}
          <div className="flex flex-col md:grid md:grid-cols-3 gap-6 space-y-12 md:space-y-0">
            {/* SMALL Logo T-Shirt */}
            <div className="border border-white/60 rounded-xl p-6 pb-9 relative bg-black/75">
              <div className="mb-6 mt-2">
                <div className="mt-1">
                  <h3 className="text-2xl font-bold text-left">SMALL Logo T-Shirt</h3>
                  <div className="text-gray-400 font-bold text-base">$30.00 + Tax</div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Unisex sizing. Fits even if you're confused.</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Super-soft 100% Organic Cotton, pretend you care.</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Printed in USA, but manufactured by babies that can't escape, err, walk.</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Wash cold. But stay warm at heart.</span>
                </div>
              </div>

              <div className="h-4"></div>

              {/* Stripe Buy Button for SMALL */}
              <div className="w-full mt-6 flex justify-center" style={{ transform: 'scale(0.75)', transformOrigin: 'center' }}>
                <div 
                  dangerouslySetInnerHTML={{
                    __html: `<stripe-buy-button
                      buy-button-id="buy_btn_1S7q2VDswvCz4i75ctiuluFh"
                      publishable-key="pk_live_51R8V3pDswvCz4i75mfwXYkDGB4Y7LrrDydQQ7UKq2XVt742KMpFsWSK4ekm1a0kQ7gvRIkysriO8zJ6jVgyjzS5a001MBLYYkQ"
                    ></stripe-buy-button>`
                  }}
                />
              </div>
            </div>

            {/* MEDIUM Logo T-Shirt */}
            <div className="border border-orange-500 rounded-xl p-6 pb-9 relative bg-black/75">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>

              {/* T-Shirt Icon - Upper Right */}
              <div className="absolute top-4 right-4">
                <img
                  src="/images/plan_icon_roadie.png"
                  alt="Medium T-Shirt Icon"
                  className="w-12 h-12"
                  style={{ filter: 'hue-rotate(45deg) saturate(200%) brightness(1.6)' }}
                />
              </div>

              {/* Price Pill - Bottom Edge Overlap */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-7 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                $30.00 + Tax
              </div>
              <div className="mb-6 mt-2">
                <div className="mt-1">
                  <h3 className="text-2xl font-bold text-left">MEDIUM Logo T-Shirt</h3>
                  <div className="text-orange-400 font-bold text-base">$30.00 + Tax</div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Unisex sizing</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Super-soft 100% Organic Cotton, pretend you care.</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Printed in USA, but manufactured by babies that can't escape, err, walk yet.</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Wash cold. But stay warm at heart.</span>
                </div>
              </div>

              <div className="h-4"></div>

              {/* Placeholder for MEDIUM Stripe Buy Button */}
              <div className="w-full mt-6 bg-orange-500/15 border-2 border-orange-500 text-white py-2 text-sm hover:bg-orange-500/25 transition-colors font-bold flex items-center justify-center"
                style={{ borderRadius: '60px' }}>
                COMING SOON
              </div>
            </div>

            {/* LARGE Logo T-Shirt */}
            <div className="border rounded-xl p-6 pb-9 relative bg-black/75" style={{ borderColor: '#8dc641' }}>
              {/* T-Shirt Icon - Upper Right */}
              <div className="absolute top-4 right-4">
                <img
                  src="/images/plan_icon_hero.png"
                  alt="Large T-Shirt Icon"
                  className="w-14 h-14"
                  style={{ filter: 'brightness(0.8)' }}
                />
              </div>

              {/* Price Pill - Bottom Edge Overlap */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-7 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                $30.00 + Tax
              </div>
              <div className="mb-6 mt-2">
                <div className="mt-1">
                  <h3 className="text-2xl font-bold text-left">LARGE Logo T-Shirt</h3>
                  <div className="font-bold text-base" style={{ color: '#8dc641' }}>
                    $30.00 + Tax
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Unisex sizing</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Super-soft 100% Organic Cotton, pretend you care.</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Printed in USA, but manufactured by babies that can't escape, err, walk yet.</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: '#8dc641' }}>✓</span>
                  <span>Wash cold. But stay warm at heart.</span>
                </div>
              </div>

              <div className="h-4"></div>

              {/* Placeholder for LARGE Stripe Buy Button */}
              <div className="w-full mt-6 text-white py-2 text-sm transition-colors font-bold flex items-center justify-center border-2"
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(141, 198, 65, 0.25)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(141, 198, 65, 0.15)'}
                style={{
                  backgroundColor: 'rgba(141, 198, 65, 0.15)',
                  borderColor: '#8dc641',
                  borderRadius: '60px'
                }}>
                COMING SOON
              </div>
            </div>
          </div>

          {/* Bubbling Text - Right-aligned under Hero card */}
          <div className="flex justify-end mt-4 mb-16">
            <div className="text-gray-500 text-xs">*bubbling</div>
          </div>

          {/* Testimonial Carousel */}
          <div className="mt-12">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-yellow-400">What Our Customers Say</h2>

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
                        "This t-shirt is incredibly soft and comfortable! The logo looks amazing and the quality is top-notch. Perfect for jamming sessions!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Alex M.</p>
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
                        <span className="text-gray-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "Didn't fit quite right, too small. But the material is super soft and the design is awesome. Just need to size up next time!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Sarah L.</p>
                    </div>
                  </div>

                  {/* Review Card 3 */}
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="flex space-x-1">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-gray-400 text-lg">★</span>
                        <span className="text-gray-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "It shrunk in the dryer but I put in hot, and it says dry cool, whoops! Still love the design though."
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Mike D.</p>
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
                        "Love this shirt! The organic cotton feels amazing and the logo is perfectly printed. Gets compliments everywhere I go!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Emma R.</p>
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
                        <span className="text-gray-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "The tag is a little itchy. But the shirt itself is super comfortable and the design is exactly what I wanted!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Jake T.</p>
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
                        "Perfect fit and amazing quality! The unisex sizing works great and the material is so soft. Definitely ordering more!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Lisa K.</p>
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
                        <span className="text-gray-400 text-lg">★</span>
                      </div>
                    </div>
                    <div className="relative">
                      <p className="text-white text-sm leading-relaxed px-2">
                        "Great shirt overall! The quality is solid and the design is clean. Shipping was fast too. Would recommend to friends!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Ryan P.</p>
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
                        "Absolutely love this t-shirt! The organic cotton is so comfortable and the logo looks amazing. Perfect for guitar practice!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Nina W.</p>
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
                        "Simple, clean design that just works. The unisex fit is perfect and the material feels great. Exactly what I needed!"
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <p className="text-white/70 text-xs italic">Tom B.</p>
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