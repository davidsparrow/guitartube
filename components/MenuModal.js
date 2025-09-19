// components/MenuModal.js - Standalone Menu Modal Component
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../contexts/UserContext'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile, getFeatureGates } from '../lib/supabase'
import { PiButterflyFill, PiGuitarFill, PiSealQuestionFill, PiRabbitFill, PiMailboxFill } from "react-icons/pi"
import { FiLogOut } from "react-icons/fi"


export default function MenuModal({ isOpen, onClose }) {
  const router = useRouter()
  const { profile, userEmail, refreshProfile } = useUser()
  const { isAuthenticated, signOut, resetPassword } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showBackstageAlert, setShowBackstageAlert] = useState(false)
  const [isUpdatingResume, setIsUpdatingResume] = useState(false)
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)
  const [handleValue, setHandleValue] = useState('')
  const [originalHandleValue, setOriginalHandleValue] = useState('')
  const [isSavingHandle, setIsSavingHandle] = useState(false)
  const [featureGates, setFeatureGates] = useState(null)
  const [featureGatesLoading, setFeatureGatesLoading] = useState(false)
  const [featureGatesError, setFeatureGatesError] = useState(null)

  // Trigger password reset using same flow as AuthModal
  const handlePasswordReset = async () => {
    if (!userEmail) {
      alert('No email found for your account. Please sign in again.');
      return
    }
    try {
      await resetPassword(userEmail)
      alert('Password reset email sent! Check your inbox.')
    } catch (err) {
      console.error('Password reset failed:', err)
      alert('Failed to send password reset email. Please try again.')
    }
  }

  // Handle save handle function
  const handleSaveHandle = async () => {
    if (!profile?.id) {
      alert('Profile not found. Please try again.');
      return;
    }

    const trimmedHandle = handleValue.trim();
    
    // Validate handle format
    if (trimmedHandle && !/^[a-z0-9_]+$/.test(trimmedHandle)) {
      alert('Handle can only contain lowercase letters, numbers, and underscores.');
      return;
    }
    
    if (trimmedHandle && (trimmedHandle.length < 3 || trimmedHandle.length > 30)) {
      alert('Handle must be between 3 and 30 characters.');
      return;
    }

    setIsSavingHandle(true);
    try {
      const { data, error } = await updateUserProfile(profile.id, {
        handle: trimmedHandle || null
      });

      if (error) throw error;

      console.log('✅ Handle updated successfully:', data);
      setOriginalHandleValue(trimmedHandle);
      alert('Handle updated successfully!');
    } catch (error) {
      console.error('❌ Error updating handle:', error);
      alert('Failed to update handle. Please try again.');
    } finally {
      setIsSavingHandle(false);
    }
  }

  // Handle profile modal open - initialize handle values
  const handleProfileModalOpen = () => {
    const currentHandle = profile?.handle || '';
    setHandleValue(currentHandle);
    setOriginalHandleValue(currentHandle);
    setShowProfileModal(true);
    
    // Load feature gates when profile modal opens
    if (!featureGates && !featureGatesLoading && !featureGatesError) {
      loadFeatureGates();
    }
  }

  // Handle profile modal close - revert changes if not saved
  const handleProfileModalClose = () => {
    setHandleValue(originalHandleValue);
    setShowProfileModal(false);
  }

  // Handle logout functionality
  const handleLogout = async () => {
    try {
      await signOut()
      onClose() // Close the menu modal after logout
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Handle resume toggle functionality
  const handleResumeToggle = async () => {
    if (!profile?.id || isUpdatingResume) return

    setIsUpdatingResume(true)
    try {
      const newResumeEnabled = !profile.resume_enabled

      console.log('🔄 Updating resume setting:', {
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
      alert('An error occurred. Please try again.')
    } finally {
      setIsUpdatingResume(false)
    }
  }

  // Handle manage subscription (Stripe Customer Portal)
  const handleManageSubscription = async () => {
    if (!profile?.id || isManagingSubscription) return

    setIsManagingSubscription(true)
    try {
      console.log('🔄 Opening Stripe Customer Portal for user:', profile.id)

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: profile.id,
          userEmail: userEmail,
          returnUrl: window.location.origin
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Portal session creation failed:', result)
        
        // DEBUG: Add detailed frontend logging
        console.log('🔍 FRONTEND DEBUG: Full error result:', JSON.stringify(result, null, 2))
        console.log('🔍 FRONTEND DEBUG: Support info string:', result.supportInfo)

        // Show detailed error message for support
        const errorMessage = result.supportInfo
          ? `Error: ${result.error}\n\nSupport Info: ${result.supportInfo}`
          : `Error: ${result.error}`

        alert(errorMessage)
        return
      }

      console.log('✅ Portal session created successfully:', result)

      // Redirect to Stripe Customer Portal
      if (result.url) {
        window.location.href = result.url
      } else {
        console.error('❌ No portal URL returned')
        alert('Failed to open subscription management. Please try again.')
      }

    } catch (error) {
      console.error('❌ Error in handleManageSubscription:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsManagingSubscription(false)
    }
  }

  // Load feature gates from admin_settings
  const loadFeatureGates = async () => {
    try {
      setFeatureGatesLoading(true)
      setFeatureGatesError(null)
      
      console.log('🔄 Loading feature gates for MenuModal...')
      
      const data = await getFeatureGates()
      
      if (data && data.setting_value) {
        setFeatureGates(data.setting_value)
        console.log('✅ Feature gates loaded successfully:', data.setting_value)
      } else {
        console.error('❌ No feature gates data returned')
        setFeatureGatesError('No feature gates data available')
      }
    } catch (error) {
      console.error('❌ Error loading feature gates:', error)
      setFeatureGatesError('Failed to load feature gates')
    } finally {
      setFeatureGatesLoading(false)
    }
  }

  // Helper function to get plan limits from feature gates
  const getPlanLimit = (limitType, tier) => {
    if (!featureGates || !featureGates[limitType]) {
      return null
    }
    return featureGates[limitType][tier] || 0
  }

  // Helper function to format time display (minutes to HH:MM format)
  const formatTimeDisplay = (usedMinutes, limitMinutes) => {
    if (limitMinutes === -1) return 'Unlimited'
    
    const usedHours = Math.floor(usedMinutes / 60)
    const usedMins = usedMinutes % 60
    const limitHours = Math.floor(limitMinutes / 60)
    const limitMins = limitMinutes % 60
    
    return `${usedHours}:${String(usedMins).padStart(2, '0')} / ${limitHours}:${String(limitMins).padStart(2, '0')}`
  }

  // Helper function to get error display for limits
  const getErrorDisplay = () => {
    if (featureGatesLoading) return 'Loading...'
    if (featureGatesError) return 'ERROR'
    return null
  }

  if (!isOpen) return null

  // Show backstage modal for non-authenticated users
  if (!isAuthenticated) {
    return (
      <>
        {/* Backdrop */}
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
      </>
    )
  }

  // Show main menu modal for authenticated users
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
                    handleProfileModalOpen();
                  }}
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold bg-transparent border-none cursor-pointer"
                >
                  <PiButterflyFill className="text-xl" />
                  <span>PROFILE</span>
                </button>


                <a 
                  href="/how-to-faqs"
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold"
                >
                  <PiSealQuestionFill className="text-xl" />
                  <span>HOW-TO & FAQS</span>
                </a>
                
                <a 
                  href="/schwag"
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold"
                >
                  <PiGuitarFill className="text-xl" />
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
                  onClick={() => {
                    onClose() // Close menu modal first
                    router.push('/contact') // Navigate to contact page
                  }}
                  className="flex items-center gap-3 w-full text-white hover:text-yellow-400 transition-colors text-lg font-semibold bg-transparent border-none cursor-pointer"
                >
                  <PiMailboxFill className="text-xl" />
                  <span>CONTACT</span>
                </button>
                
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

      {/* Backstage Alert Modal */}
      {showBackstageAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white p-6">
            {/* Modal Content */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-4">🎭 Backstage Access Only</h2>
              <p className="text-gray-300 text-sm">
                You're only backstage. Signup to get in front of the crowd!
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  onClose()
                  router.push('/pricing')
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Free
              </button>
              <button
                onClick={() => setShowBackstageAlert(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div 
            className="bg-black rounded-2xl shadow-2xl max-w-md w-full relative text-white border border-white"
            style={{
              backgroundImage: 'url("/images/live_edge_guitar_pink.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Dark overlay - Fixed position to stay over background image */}
            <div className="absolute inset-0 bg-black/30 rounded-2xl pointer-events-none"></div>
            
            {/* Close Button */}
            <button
              onClick={handleProfileModalClose}
              className="absolute top-3 right-3 text-gray-300 hover:text-white transition-colors text-xl font-bold z-20"
            >
              ×
            </button>
            
            {/* Scrollable content container */}
            <div 
              className="relative z-10 p-6 max-h-[80vh] overflow-y-auto profile-modal-scroll"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4B5563 transparent'
              }}
            >
            
            {/* Profile Content */}
            <div className="relative z-10" style={{ marginLeft: '25px', marginRight: '25px' }}>
              {/* Title left-justified with labels; avatar right-aligned with Settings button */}
              <div className="flex items-end justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PiButterflyFill className="text-white text-3xl" />
                  <h2 className="text-3xl font-bold text-white">Profile</h2>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {userEmail?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              
              {/* Profile Details - Compact Label: Value format */}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex">
                  <span className="text-gray-400 w-32">Name:</span>
                  <span className="text-white" style={{ marginLeft: '-65px' }}>{profile?.full_name || userEmail?.split('@')[0] || 'User'}</span>
                </div>
                
                <div className="flex">
                  <span className="text-gray-400 w-32">Email:</span>
                  <span className="text-white" style={{ marginLeft: '-65px' }}>{userEmail || 'No email'}</span>
                </div>

                {/* Reset Password Link - Left-aligned with Profile values */}
                <div className="flex">
                  <span className="text-gray-400 w-32">Creds:</span>
                  <button
                    onClick={handlePasswordReset}
                    className="text-blue-400 hover:text-blue-300 text-sm underline transition-colors"
                    style={{ marginLeft: '-65px' }}
                  >
                    Reset Password
                  </button>
                </div>

                {/* Handle Field */}
                <div className="flex items-center">
                  <span className="text-gray-400 w-32">Handle:</span>
                  <div className="flex items-center gap-2" style={{ marginLeft: '-65px' }}>
                    <input
                      type="text"
                      value={handleValue}
                      onChange={(e) => {
                        // Only allow lowercase letters, numbers, and underscores
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                        setHandleValue(value);
                      }}
                      placeholder="Enter your handle..."
                      className="bg-transparent border border-gray-500 rounded px-1 py-0.5 text-white text-xs placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                      style={{ minWidth: '60px' }}
                      maxLength={30}
                    />
                    {handleValue !== originalHandleValue && (
                      <button
                        onClick={handleSaveHandle}
                        disabled={isSavingHandle}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingHandle ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Resume Toggle - Only show for roadie/hero users */}
                {profile?.subscription_tier && ['roadie', 'hero'].includes(profile.subscription_tier) && (
                  <div className="flex items-center">
                    <span className="text-gray-400 w-32">Resume Last Video:</span>
                    <button
                      onClick={handleResumeToggle}
                      disabled={isUpdatingResume}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        profile?.resume_enabled
                          ? 'bg-yellow-400'
                          : 'bg-gray-600'
                      } ${isUpdatingResume ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      style={{ marginLeft: '10px' }}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          profile?.resume_enabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}


                {/* Action Buttons - Moved below Resume toggle, above Plan Details */}
                <div className="space-y-2 mt-4">
                  <button className="w-full bg-blue-600/20 border border-blue-600 text-blue-300 hover:bg-blue-600/30 rounded-[60px] px-3 py-2 text-sm transition-all duration-200">
                    Settings
                  </button>
                </div>

                {/* Plan Details Section */}
                <div className="mt-6 pt-4 border-t border-white/20">
                  <div className="flex items-center gap-2 mb-4">
                    <PiGuitarFill className="text-white text-3xl" />
                    <h3 className="text-2xl font-bold text-white">Plan Details</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="text-gray-400 w-32">Current Plan:</span>
                      <span className="text-white capitalize" style={{ marginLeft: '-3px' }}>
                        {profile?.subscription_tier || 'Freebird'}
                        {profile?.subscription_status && ` (${profile.subscription_status})`}
                      </span>
                    </div>
                    
                    <div className="flex">
                      <span className="text-gray-400 w-32">Daily Watch Time:</span>
                      <span className="text-white" style={{ marginLeft: '-3px' }}>
                        {(() => {
                          const errorDisplay = getErrorDisplay()
                          if (errorDisplay) return errorDisplay
                          
                          const tier = profile?.subscription_tier || 'freebird'
                          const watchLimit = getPlanLimit('daily_watch_time_limits', tier)
                          
                          if (watchLimit === null) return 'ERROR'
                          
                          return formatTimeDisplay(profile?.total_watch_time_minutes || 0, watchLimit)
                        })()}
                      </span>
                    </div>
                    
                    <div className="flex">
                      <span className="text-gray-400 w-32">Daily Searches:</span>
                      <span className="text-white" style={{ marginLeft: '-3px' }}>
                        {(() => {
                          const errorDisplay = getErrorDisplay()
                          if (errorDisplay) return errorDisplay
                          
                          const tier = profile?.subscription_tier || 'freebird'
                          const searchLimit = getPlanLimit('daily_search_limits', tier)
                          
                          if (searchLimit === null) return 'ERROR'
                          
                          if (searchLimit === -1) return 'Unlimited'
                          
                          return `${profile?.daily_searches_used || 0} / ${searchLimit}`
                        })()}
                      </span>
                    </div>
                    
                    <div className="flex">
                      <span className="text-gray-400 w-32">Faves:</span>
                      <span className="text-white" style={{ marginLeft: '-3px' }}>
                        {(() => {
                          const errorDisplay = getErrorDisplay()
                          if (errorDisplay) return errorDisplay
                          
                          const tier = profile?.subscription_tier || 'freebird'
                          const limit = getPlanLimit('favorite_limits', tier)
                          
                          if (limit === -1) {
                            return 'Unlimited'
                          } else if (limit === 0) {
                            return `${profile?.favorites_count || 0} / 0`
                          } else {
                            return `${profile?.favorites_count || 0} / ${limit}`
                          }
                        })()}
                      </span>
                    </div>
                    
                    <div className="flex">
                      <span className="text-gray-400 w-32">Billing Cycle:</span>
                      <span className="text-white" style={{ marginLeft: '-3px' }}>Monthly</span>
                    </div>
                    
                    <div className="flex">
                      <span className="text-gray-400 w-32">Amount:</span>
                      <span className="text-white" style={{ marginLeft: '-3px' }}>
                        ${profile?.subscription_tier === 'hero' ? '19' : 
                          profile?.subscription_tier === 'roadie' ? '10' : '0'}/mo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manage Subscription Button - At bottom */}
                <div className="mt-4">
                  <button
                    onClick={handleManageSubscription}
                    disabled={isManagingSubscription || !profile?.subscription_tier || profile?.subscription_tier === 'freebird'}
                    className="w-full bg-green-600/20 border border-green-600 text-green-300 hover:bg-green-600/30 rounded-[60px] px-3 py-2 text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isManagingSubscription ? 'Opening…' : 'Manage Subscription'}
                  </button>
                </div>
              </div>
            </div>
            </div> {/* Close scrollable content container */}
          </div>
        </div>
      )}
    </>
  )
}
