// components/MenuModal.js - Standalone Menu Modal Component
import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile } from '../lib/supabase'
import { PiButterflyFill, PiSuitcaseSimpleFill, PiGuitarFill, PiSealQuestionFill, PiShirtFoldedFill, PiRabbitFill } from "react-icons/pi"
import { FiLogOut } from "react-icons/fi"


export default function MenuModal({ isOpen, onClose, onSupportClick }) {
  const { profile, userEmail, refreshProfile } = useUser()
  const { isAuthenticated, signOut } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showBackstageAlert, setShowBackstageAlert] = useState(false)
  const [isUpdatingResume, setIsUpdatingResume] = useState(false)
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)

  // Handle logout functionality
  const handleLogout = async () => {
    try {
      await signOut()
      onClose() // Close the menu modal
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Handle resume toggle
  const handleResumeToggle = async () => {
    if (!profile?.id || isUpdatingResume) return

    setIsUpdatingResume(true)

    try {
      const newResumeEnabled = !profile.resume_enabled

      console.log('🔄 Updating resume_enabled:', {
        userId: profile.id,
        currentValue: profile.resume_enabled,
        newValue: newResumeEnabled
      })

      const { data, error } = await updateUserProfile(profile.id, {
        resume_enabled: newResumeEnabled
      })

      if (error) {
        console.error('❌ Error updating resume setting:', error)
        alert('Failed to update resume setting. Please try again.')
        return
      }

      console.log('✅ Resume setting updated successfully:', data)

      // Refresh profile to get updated data
      refreshProfile()

    } catch (error) {
      console.error('❌ Error in handleResumeToggle:', error)
      alert('Failed to update resume setting. Please try again.')
    } finally {
      setIsUpdatingResume(false)
    }
  }



  // Handle manage subscription (Stripe Customer Portal)
  const handleManageSubscription = async () => {
    if (!profile?.id || isManagingSubscription) return

    // Validate user has paid subscription
    if (!profile.subscription_tier || profile.subscription_tier === 'freebird') {
      alert('Subscription management is only available for paid subscribers (Roadie and Hero plans).')
      return
    }

    setIsManagingSubscription(true)

    try {
      console.log('🔄 Opening subscription management portal for user:', profile.id)

      // Get current page URL for return
      const returnUrl = window.location.href

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: profile.id,
          userEmail: userEmail,
          returnUrl: returnUrl
        })
      })

      const result = await response.json()

      console.log('🔍 Portal API Response:', {
        status: response.status,
        ok: response.ok,
        result: result
      });

      if (!response.ok || !result.success) {
        console.error('❌ Portal API returned error:', result);

        // DEBUG: Add detailed frontend logging
        console.log('🔍 FRONTEND DEBUG: Full error result:', JSON.stringify(result, null, 2))
        console.log('🔍 FRONTEND DEBUG: Support info string:', result.supportInfo)

        // Show detailed error message for support
        const errorMessage = result.supportInfo
          ? `${result.message}\n\nFor support, please copy this information:\n${result.supportInfo}`
          : result.message || 'Failed to open subscription management'

        console.log('🔍 FRONTEND DEBUG: Message we will show:', errorMessage)

        alert(errorMessage)
        return
      }

      console.log('✅ Portal session created successfully, redirecting to:', result.url)

      // Close modal first, then redirect to Stripe Customer Portal
      onClose()

      // Small delay to ensure modal closes, then open in new tab
      setTimeout(() => {
        console.log('🔄 Opening Stripe Customer Portal in new tab:', result.url)
        window.open(result.url, '_blank')
      }, 200)

    } catch (error) {
      console.error('❌ Error opening subscription management:', error)

      const errorMessage = `Failed to open subscription management: ${error.message}\n\nFor support, please copy this information:\nError: ${error.message}\nUser: ${userEmail}\nError code: CLIENT_SIDE_ERROR`

      alert(errorMessage)
    } finally {
      setIsManagingSubscription(false)
    }
  }

  if (!isOpen) return null

  // Check authentication - show backstage alert for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white p-6">
          {/* Modal Content */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-4">🎭 Backstage Access Only</h2>
            <p className="text-gray-300 text-sm">
              You're only backstage. Signup to get in front of the crowd!
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                onClose()
                window.location.href = '/pricing'
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Free
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Menu Modal */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div 
          className="w-[300px] h-full relative"
          style={{
            marginTop: '5px', // Position just below hamburger
            backgroundImage: 'url("/images/mexican%20giant%20guitar_dark3.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Grey overlay to darken background image */}
          <div className="absolute inset-0 bg-gray-800 bg-opacity-50 z-0"></div>
          {/* Close Button - Same style as other modals */}
          <button
            onClick={onClose}
            className="absolute top-3 right-9 text-white hover:text-yellow-400 transition-colors text-2xl font-bold z-20"
          >
            ×
          </button>
          
          {/* Menu Content */}
          <div className="pt-16 relative z-10 flex flex-col justify-start h-full">
            <div className="text-white space-y-6">
              {/* All Menu Links - Left Justified with Icons */}
              <div className="space-y-4" style={{ marginLeft: '25px', marginTop: '33px' }}>
                <button
                  onClick={() => {
                    console.log('🔍 PROFILE BUTTON CLICKED');
                    setShowProfileModal(true);
                  }}
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold bg-transparent border-none cursor-pointer"
                >
                  <PiButterflyFill className="text-xl" />
                  <span>PROFILE</span>
                </button>

                <button
                  onClick={() => setShowPlanModal(true)}
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold bg-transparent border-none cursor-pointer"
                >
                  <PiSuitcaseSimpleFill className="text-xl" />
                  <span>PLAN DEETS</span>
                </button>

                <a 
                  href="/how-to-faqs"
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold"
                >
                  <PiGuitarFill className="text-xl" />
                  <span>HOW-TO & FAQS</span>
                </a>
                
                <button
                  onClick={() => {
                    onClose() // Close menu modal first
                    if (onSupportClick) onSupportClick() // Then open support modal
                  }}
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold bg-transparent border-none cursor-pointer"
                >
                  <PiSealQuestionFill className="text-xl" />
                  <span>SUPPORT</span>
                </button>
                
                <a 
                  href="/schwag"
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold"
                >
                  <PiShirtFoldedFill className="text-xl" />
                  <span>SCHWAG</span>
                </a>
                
                <a
                  href="/community_guidelines"
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold"
                >
                  <PiRabbitFill className="text-xl" />
                  <span>COMMUNITY</span>
                </a>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full text-white hover:text-red-400 transition-colors text-lg font-semibold bg-transparent border-none cursor-pointer"
                >
                  <FiLogOut className="text-xl" />
                  <span>LOGOUT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowProfileModal(false)
            }
          }}
        >
          <div className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white p-8">
            {/* Close Button */}
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors text-2xl font-bold"
            >
              ×
            </button>
            
            {/* Profile Content */}
            {console.log('🔍 PROFILE MODAL RENDERING:', { showProfileModal, profile })}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-4">Profile</h2>
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {userEmail?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            
            <div className="space-y-4 text-gray-300">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Name</p>
                <p className="font-medium">{profile?.full_name || userEmail?.split('@')[0] || 'User'}</p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Email</p>
                <p className="font-medium">{userEmail || 'No email'}</p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Subscription</p>
                <p className="font-medium capitalize">{profile?.subscription_tier || 'Freebird'}</p>
              </div>

              {/* Resume Toggle Switch - Only show for roadie/hero users */}
              {profile?.subscription_tier && ['roadie', 'hero'].includes(profile.subscription_tier) && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Login: Resume Last Video</p>
                      <p className="text-xs text-gray-500">Auto-resume your last video when you log in</p>
                    </div>
                    <button
                      onClick={handleResumeToggle}
                      disabled={isUpdatingResume}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                        profile?.resume_enabled
                          ? 'bg-yellow-400'
                          : 'bg-gray-600'
                      } ${isUpdatingResume ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          profile?.resume_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Plan Modal */}
      {showPlanModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPlanModal(false)
            }
          }}
        >
          <div className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white p-8">
            {/* Close Button */}
            <button
              onClick={() => setShowPlanModal(false)}
              className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors text-2xl font-bold"
            >
              ×
            </button>
            
            {/* Plan Content */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-4">Plan Details</h2>
            </div>
            
            <div className="space-y-4 text-gray-300">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Current Plan</p>
                <p className="font-medium capitalize text-xl">{profile?.subscription_tier || 'Freebird'}</p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Daily Watch Limit</p>
                <p className="font-medium text-xl">
                  {profile?.subscription_tier === 'hero' ? '480 minutes (8 hours)' : 
                   profile?.subscription_tier === 'roadie' ? '180 minutes (3 hours)' : 
                   '60 minutes (1 hour)'}
                </p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Daily Search Limit</p>
                <p className="font-medium text-xl">
                  {profile?.subscription_tier === 'hero' ? 'Unlimited' : 
                   profile?.subscription_tier === 'roadie' ? '20 searches' : 
                   '0 searches (blocked)'}
                </p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Saved Faves Limit</p>
                <p className="font-medium text-xl">
                  {profile?.subscription_tier === 'hero' ? 'Unlimited' : 
                   profile?.subscription_tier === 'roadie' ? '12 faves' : 
                   '0 faves (blocked)'}
                </p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Billing Cycle</p>
                <p className="font-medium">Monthly</p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Amount</p>
                <p className="font-medium text-xl">
                  ${profile?.subscription_tier === 'hero' ? '19' : 
                    profile?.subscription_tier === 'roadie' ? '10' : '0'}/mo
                </p>
              </div>
              
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleManageSubscription}
                  disabled={isManagingSubscription}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isManagingSubscription ? 'Opening...' : 'Manage Your Subscription'}
                </button>

                {profile?.subscription_tier !== 'hero' && (
                  <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors">
                    UPGRADE
                  </button>
                )}

                {/* REMOVED: Broken Profile modal cancel button */}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
