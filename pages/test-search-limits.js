// pages/test-search-limits.js - Test page for search limits across all tiers
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUser } from '../contexts/UserContext'
import { supabase } from '../lib/supabase/client'
import { testSearchLimits, getFeatureGates } from '../lib/supabase'
import Layout from '../components/Layout'

export default function TestSearchLimits() {
  const { user, isAuthenticated } = useAuth()
  const { profile, featureGates, getDailySearchLimit, checkDailySearchLimit, refreshProfile } = useUser()
  const [testResults, setTestResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentTier, setCurrentTier] = useState('')

  useEffect(() => {
    if (profile) {
      setCurrentTier(profile.subscription_tier || 'freebird')
    }
  }, [profile])

  // Test the search limits from database
  const runDatabaseTest = async () => {
    setLoading(true)
    setMessage('Testing database search limits...')
    
    try {
      const results = await testSearchLimits()
      const featureGatesData = await getFeatureGates()
      
      setTestResults({
        database: results,
        featureGates: featureGatesData,
        userContext: {
          currentLimit: getDailySearchLimit(),
          canSearch: checkDailySearchLimit(),
          dailyUsed: profile?.daily_searches_used || 0
        }
      })
      
      setMessage('✅ Test completed successfully!')
    } catch (error) {
      console.error('Test failed:', error)
      setMessage('❌ Test failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Change user's subscription tier for testing
  const changeTier = async (newTier) => {
    if (!user?.id) return
    
    setLoading(true)
    setMessage(`Changing tier to ${newTier}...`)
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          subscription_tier: newTier,
          subscription_status: 'active'
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      // Refresh profile to get updated data
      await refreshProfile()
      setCurrentTier(newTier)
      setMessage(`✅ Successfully changed to ${newTier} tier!`)
      
      // Auto-run test after tier change
      setTimeout(() => {
        runDatabaseTest()
      }, 1000)
      
    } catch (error) {
      console.error('Failed to change tier:', error)
      setMessage('❌ Failed to change tier: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Reset daily search count for testing
  const resetSearchCount = async () => {
    if (!user?.id) return
    
    setLoading(true)
    setMessage('Resetting daily search count...')
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          daily_searches_used: 0,
          last_search_reset: new Date().toISOString().split('T')[0]
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      await refreshProfile()
      setMessage('✅ Daily search count reset!')
      
    } catch (error) {
      console.error('Failed to reset search count:', error)
      setMessage('❌ Failed to reset search count: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Simulate a search to test increment
  const simulateSearch = async () => {
    if (!user?.id) return
    
    setLoading(true)
    setMessage('Simulating search...')
    
    try {
      const { data, error } = await supabase
        .rpc('increment_search_usage', {
          user_id_param: user.id
        })
      
      if (error) throw error
      
      await refreshProfile()
      
      if (data) {
        setMessage('✅ Search simulated successfully!')
      } else {
        setMessage('🚫 Search blocked - daily limit reached!')
      }
      
    } catch (error) {
      console.error('Failed to simulate search:', error)
      setMessage('❌ Failed to simulate search: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Please log in to test search limits.
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Search Limits Testing Dashboard
          </h1>
          <p className="text-gray-600">
            Test search limits across all subscription tiers to verify the Feature Gates system is working correctly.
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('❌') ? 'bg-red-100 text-red-700' :
            message.includes('🚫') ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Status</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Tier:</strong> {currentTier}</div>
              <div><strong>Daily Limit:</strong> {getDailySearchLimit()}</div>
              <div><strong>Used Today:</strong> {profile?.daily_searches_used || 0}</div>
              <div><strong>Can Search:</strong> {checkDailySearchLimit() ? '✅ Yes' : '❌ No'}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Feature Gates</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Loaded:</strong> {featureGates ? '✅ Yes' : '❌ No'}</div>
              {featureGates?.daily_search_limits && (
                <>
                  <div><strong>Freebird:</strong> {featureGates.daily_search_limits.freebird}</div>
                  <div><strong>Roadie:</strong> {featureGates.daily_search_limits.roadie}</div>
                  <div><strong>Hero:</strong> {featureGates.daily_search_limits.hero}</div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={runDatabaseTest}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Run Full Test
              </button>
              <button
                onClick={resetSearchCount}
                disabled={loading}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                Reset Count
              </button>
              <button
                onClick={simulateSearch}
                disabled={loading}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                Simulate Search
              </button>
            </div>
          </div>
        </div>

        {/* Tier Testing Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Different Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => changeTier('freebird')}
              disabled={loading || currentTier === 'freebird'}
              className={`px-6 py-3 rounded-lg font-medium ${
                currentTier === 'freebird' 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              🆓 Test Freebird (8 searches)
            </button>
            <button
              onClick={() => changeTier('roadie')}
              disabled={loading || currentTier === 'roadie'}
              className={`px-6 py-3 rounded-lg font-medium ${
                currentTier === 'roadie' 
                  ? 'bg-blue-300 text-blue-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              🎸 Test Roadie (24 searches)
            </button>
            <button
              onClick={() => changeTier('hero')}
              disabled={loading || currentTier === 'hero'}
              className={`px-6 py-3 rounded-lg font-medium ${
                currentTier === 'hero' 
                  ? 'bg-yellow-300 text-yellow-600 cursor-not-allowed' 
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              🏆 Test Hero (100 searches)
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Database Function Results:</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(testResults.database, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Feature Gates Data:</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(testResults.featureGates, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">UserContext Data:</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(testResults.userContext, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
