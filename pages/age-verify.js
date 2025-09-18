// pages/age-verify.js - Age Verification Page
import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'

export default function AgeVerifyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [initials, setInitials] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!initials.trim()) {
      alert('Please enter your initials to continue.')
      return
    }
    
    if (!ageConfirmed) {
      alert('Please confirm you are 18+ years old.')
      return
    }

    // Show terms acceptance modal
    setShowTermsModal(true)
  }

  const handleTermsAccept = async () => {
    setLoading(true)
    
    try {
      // Save initials to Supabase if user is authenticated
      if (user) {
        const response = await fetch('/api/user/save-initials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initials: initials.trim(),
            userId: user.id
          })
        })

        if (response.ok) {
          console.log('✅ Initials saved to Supabase:', initials.trim())
        } else {
          console.error('❌ Error saving initials:', await response.text())
        }
      }
    } catch (error) {
      console.error('❌ Error saving initials:', error)
      // Continue anyway - don't block the user
    }
    
    // Set age verification cookie
    document.cookie = 'ageVerified=true; path=/; max-age=2592000; samesite=lax' // 30 days
    
    // Get the intended destination from query params or default to home
    const redirectTo = router.query.redirect || '/'
    
    // Redirect to intended destination
    router.push(redirectTo)
  }

  const handleTermsCancel = () => {
    setShowTermsModal(false)
    setInitials('')
    setAgeConfirmed(false)
  }

  return (
    <>
      <Head>
        <title>Age Verification - GuitarTube</title>
        <meta name="description" content="Please verify your age to access GuitarTube" />
      </Head>

      {/* Background with baby on guitar image */}
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url("/images/gt_splash_baby_on_guitar_1092.png")',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-md">
          {/* Main Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <img 
                src="/images/gt_logoM_PlayButton.png" 
                alt="GuitarTube Logo" 
                className="h-16 w-auto mx-auto mb-4"
                onError={(e) => {
                  console.error('Logo image failed to load:', e.target.src)
                  e.target.style.display = 'none'
                }}
              />
              <h1 className="text-2xl font-bold text-white mb-2">Age Verification</h1>
              <p className="text-gray-300 text-sm">Please verify your age to access our platform</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Initials Input */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Enter Your Initials *
                </label>
                <input
                  type="text"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                  placeholder="e.g., J.D."
                  maxLength={10}
                  required
                />
                <p className="text-gray-400 text-xs mt-1">
                  This helps us verify you are of appropriate age
                </p>
              </div>

              {/* Age Confirmation */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="ageConfirm"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                  required
                />
                <label htmlFor="ageConfirm" className="text-white text-sm">
                  I confirm that I am 18 years of age or older *
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Continue to GuitarTube'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-xs">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms Acceptance Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Terms of Service
              </h2>
              <p className="text-gray-600 mb-6">
                Click OK to accept our Terms of Service. Visit our Terms page for all details about being a User on our platform.
              </p>
              <p className="text-gray-500 text-sm mb-4">
                Terms URL: https://guitartube.net/terms
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleTermsCancel}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTermsAccept}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
