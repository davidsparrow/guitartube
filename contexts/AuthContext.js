// contexts/AuthContext.js - Authentication Only (Profile moved to UserContext)
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase/client'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Auto-resume function
  const handleAutoResume = async (userId) => {
    try {
      console.log('🔍 CHECKING AUTO-RESUME for user:', userId)

      // Get user profile with resume settings
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('resume_enabled, last_video_id, last_video_timestamp, last_video_title, last_video_channel_name')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Error fetching profile for auto-resume:', error)
        return
      }

      if (!profile) {
        console.log('❌ No profile found for auto-resume')
        return
      }

      console.log('🔍 AUTO-RESUME CHECK:', {
        resumeEnabled: profile.resume_enabled,
        hasVideoId: !!profile.last_video_id,
        hasTimestamp: !!profile.last_video_timestamp,
        videoTitle: profile.last_video_title
      })

      // Check if auto-resume is enabled and user has a saved session
      if (profile.resume_enabled && profile.last_video_id && profile.last_video_timestamp) {
        console.log('✅ AUTO-RESUME CONDITIONS MET - Navigating to video:', {
          videoId: profile.last_video_id,
          timestamp: profile.last_video_timestamp,
          title: profile.last_video_title
        })

        // Build resume URL with timestamp
        const resumeUrl = `/watch?v=${profile.last_video_id}&title=${encodeURIComponent(profile.last_video_title || '')}&channel=${encodeURIComponent(profile.last_video_channel_name || '')}&t=${profile.last_video_timestamp}`

        console.log('🎯 AUTO-RESUME NAVIGATING TO:', resumeUrl)

        // Navigate to the video with a small delay to ensure auth state is settled
        setTimeout(() => {
          router.push(resumeUrl)
        }, 1000)
      } else {
        console.log('❌ AUTO-RESUME CONDITIONS NOT MET:', {
          resumeEnabled: profile.resume_enabled,
          hasVideoId: !!profile.last_video_id,
          hasTimestamp: !!profile.last_video_timestamp
        })
      }
    } catch (error) {
      console.error('❌ Error in handleAutoResume:', error)
    }
  }

  // SEPARATE useEffect for timeout (not nested!)
  useEffect(() => {
    // Safety timeout - if loading stays true for more than 10 seconds, force it to false
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ Loading timeout - forcing loading to false')
        setLoading(false)
      }
    }, 10000) // 10 seconds

    return () => clearTimeout(timeout)
  }, [loading])

  // Auth state management
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth session error:', error)
        } else if (session?.user) {
          setUser(session.user)
        }
      } catch (error) {
        console.error('Failed to get session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)

        if (session?.user) {
          setUser(session.user)

          // Handle auto-resume on sign in (not on initial session load)
          // Only trigger if auto-resume hasn't been done this session
          if (event === 'SIGNED_IN' && !sessionStorage.getItem('autoResumeTriggered')) {
            console.log('🎯 USER SIGNED IN - Checking auto-resume (first time this session)')
            sessionStorage.setItem('autoResumeTriggered', 'true')
            handleAutoResume(session.user.id)
          } else if (event === 'SIGNED_IN') {
            console.log('🔄 USER SIGNED IN - Auto-resume already triggered this session, skipping')
          }
        } else {
          setUser(null)
          // Clear auto-resume flag when user signs out
          sessionStorage.removeItem('autoResumeTriggered')
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // AUTO-RESUME FUNCTIONALITY - Implemented with proper state management
  // Triggers only on SIGNED_IN event, not on initial session load
  // Uses sessionStorage to prevent multiple auto-resume triggers per session

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) {
        console.error('Sign up error:', error)
        return { data: null, error }
      }

      console.log('Sign up successful:', data.user?.email)
      return { data, error: null }
    } catch (error) {
      console.error('Sign up failed:', error)
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Sign in error:', error)
        return { data: null, error }
      }

      console.log('Sign in successful:', data.user?.email)
      return { data, error: null }
    } catch (error) {
      console.error('Sign in failed:', error)
      return { data: null, error }
    }
  }

const signOut = async () => {
  try {
    console.log('Starting sign out...')

    // Clear auto-resume session flag before signing out
    sessionStorage.removeItem('autoResumeTriggered')

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      return { error }
    }

    console.log('Sign out successful - forcing reload')
    // Force page reload to clear all state
    window.location.href = '/'
    return { error: null }
  } catch (error) {
    console.error('Sign out failed:', error)
    return { error }
  }
}

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        console.error('Password reset error:', error)
        return { error }
      }

      console.log('Password reset email sent')
      return { error: null }
    } catch (error) {
      console.error('Password reset failed:', error)
      return { error }
    }
  }

  const value = {
    // State
    user,
    loading,
    
    // Computed values
    isAuthenticated: !!user,
    isEmailConfirmed: user?.email_confirmed_at != null,
    
    // Actions
    signUp,
    signIn,
    signOut,
    resetPassword,
    
    // Basic user data (from auth, not profile)
    userEmail: user?.email,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}