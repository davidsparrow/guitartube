// components/admin/FeatureGates.js - Feature Gates Management Component
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase/client'

export default function FeatureGates() {
  const [featureGates, setFeatureGates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')



  // Load feature gates from admin settings
  useEffect(() => {
    loadFeatureGates()
  }, [])

  const loadFeatureGates = async () => {
    try {
      setLoading(true)
      
      // Load feature gates
      const { data: featureGatesData, error: featureGatesError } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'feature_gates')
        .single()

      if (featureGatesError) throw featureGatesError

      // Load error messages
      const { data: errorMessagesData, error: errorMessagesError } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'error_messages')
        .single()

      if (errorMessagesError && errorMessagesError.code !== 'PGRST116') {
        console.error('Error loading error messages:', errorMessagesError)
      }

      // Default feature gates structure
      const defaultFeatureGates = {
        feature_gates: {
          scrolling_lyrics: {
            display_name: "Scrolling Lyrics Page",
            description: "Access to the enhanced scrolling lyrics page (watch_s)",
            required_tiers: ["hero"],
            is_enabled: true,
            upgrade_message: "Upgrade to HERO to access the Scrolling Lyrics page with enhanced video synchronization!"
          },
          login_resume: {
            display_name: "Login Resume Video",
            description: "Automatically resume last watched video on login",
            required_tiers: ["roadie", "hero"],
            is_enabled: true,
            upgrade_message: "Upgrade to ROADIE or higher to automatically resume your last video on login!"
          },
          caption_sharing: {
            display_name: "Caption Sharing",
            description: "Share videos with custom captions and timing",
            required_tiers: ["roadie", "hero"],
            is_enabled: true,
            upgrade_message: "Upgrade to ROADIE or higher to share videos with custom captions!"
          }
        },
        global_settings: {
          maintenance_mode: false,
          announcement_message: ""
        }
      }

      // Combine both configurations with defaults
      const combinedConfig = {
        ...defaultFeatureGates,
        ...(featureGatesData?.setting_value || {}),
        error_messages: errorMessagesData?.setting_value || {},
        // Ensure feature_gates exist and merge with defaults
        feature_gates: {
          ...defaultFeatureGates.feature_gates,
          ...(featureGatesData?.setting_value?.feature_gates || {})
        }
      }

      setFeatureGates(combinedConfig)
    } catch (error) {
      console.error('FeatureGates: ERROR in loadFeatureGates:', error)
      console.error('FeatureGates: Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      })
      setMessage('Error loading feature gates')
    } finally {
      setLoading(false)
    }
  }

  const saveFeatureGates = async () => {
    try {
      setSaving(true)

      // Prepare the complete feature gates structure for saving
      const featureGatesPayload = {
        feature_gates: normalizeFeatureGates(featureGates.feature_gates || {}),
        global_settings: featureGates.global_settings || {},
        daily_search_limits: featureGates.daily_search_limits || {
          freebird: 8,
          roadie: 24,
          hero: 100
        },
        daily_watch_time_limits: featureGates.daily_watch_time_limits || {
          freebird: 60,
          roadie: 180,
          hero: 480
        },
        favorite_limits: featureGates.favorite_limits || {
          freebird: 0,
          roadie: 12,
          hero: -1
        }
      }

      // Validate feature gates structure
      const validationErrors = []

      // Check that each feature gate has required properties
      Object.entries(featureGatesPayload.feature_gates).forEach(([key, feature]) => {
        if (!feature.display_name) {
          validationErrors.push(`Feature '${key}' missing display_name`)
        }
        if (!feature.description) {
          validationErrors.push(`Feature '${key}' missing description`)
        }
        if (!Array.isArray(feature.required_tiers) || feature.required_tiers.length === 0) {
          validationErrors.push(`Feature '${key}' missing or invalid required_tiers`)
        }
        if (typeof feature.is_enabled !== 'boolean') {
          validationErrors.push(`Feature '${key}' missing or invalid is_enabled`)
        }
      })

      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`)
      }

      console.log('💾 Saving feature gates payload:', featureGatesPayload)

      // Save feature gates using API endpoint with service role
      const response = await fetch('/api/admin/feature-gates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureGates: featureGatesPayload,
          userRole: 'admin' // You could get this from user context
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Feature gates API error:', result)
        throw new Error(result.error || 'Failed to save feature gates')
      }

      console.log('✅ Feature gates saved successfully via API:', result)

      // Error messages are now included in the main feature gates payload
      // No separate save needed - they're part of featureGatesPayload above

      // Verify the save was successful by reloading the data
      await loadFeatureGates()

      setMessage('✅ Feature gates and error messages saved successfully! Pricing page will update automatically.')
      setTimeout(() => setMessage(''), 5000)

      // Trigger a custom event to notify other components that feature gates have been updated
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('featureGatesUpdated', {
          detail: { featureGates: featureGatesPayload }
        }))
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const updateFeature = (featureKey, updates) => {
    setFeatureGates(prev => ({
      ...prev,
      feature_gates: {
        ...prev.feature_gates,
        [featureKey]: {
          ...prev.feature_gates[featureKey],
          ...updates
        }
      }
    }))
  }

  const updateGlobalSetting = (key, value) => {
    setFeatureGates(prev => ({
      ...prev,
      global_settings: {
        ...prev.global_settings,
        [key]: value
      }
    }))
  }

  const updateErrorMessage = (key, value) => {
    setFeatureGates(prev => ({
      ...prev,
      error_messages: {
        ...prev.error_messages,
        [key]: value
      }
    }))
  }

  const updateDailyLimit = (limitType, tier, value) => {
    setFeatureGates(prev => ({
      ...prev,
      [limitType]: {
        ...prev[limitType],
        [tier]: parseInt(value) || 0
      }
    }))
  }

  // Helper function to ensure feature gates have all required properties
  const normalizeFeatureGates = (gates) => {
    const normalized = {}

    Object.entries(gates).forEach(([key, feature]) => {
      normalized[key] = {
        display_name: feature.display_name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: feature.description || `Access control for ${key}`,
        required_tiers: Array.isArray(feature.required_tiers) ? feature.required_tiers : ['hero'],
        is_enabled: typeof feature.is_enabled === 'boolean' ? feature.is_enabled : true,
        upgrade_message: feature.upgrade_message || `Upgrade your plan to access this feature!`,
        // Preserve any additional properties
        ...feature
      }
    })

    return normalized
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  if (!featureGates) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Feature Gates</h2>
        <p className="text-gray-600">No feature gates configuration found.</p>
      </div>
    )
  }

  const features = featureGates.feature_gates || {}
  const globalSettings = featureGates.global_settings || {}

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Feature Gates</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              try {
                const normalized = normalizeFeatureGates(featureGates.feature_gates || {})
                console.log('✅ Feature gates validation passed:', normalized)
                setMessage('✅ Feature gates structure is valid!')
                setTimeout(() => setMessage(''), 3000)
              } catch (error) {
                console.error('❌ Feature gates validation failed:', error)
                setMessage(`❌ Validation failed: ${error.message}`)
                setTimeout(() => setMessage(''), 5000)
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Validate
          </button>
          <button
            onClick={saveFeatureGates}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Global Settings */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Playing Restriction Message
            </label>
            <input
              type="text"
              value={globalSettings.video_playing_message || ''}
              onChange={(e) => updateGlobalSetting('video_playing_message', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please pause video before using this feature"
            />
            <p className="text-xs text-gray-500 mt-1">Message shown when users try to use features while video is playing</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Upgrade Message
            </label>
            <input
              type="text"
              value={globalSettings.plan_upgrade_message || ''}
              onChange={(e) => updateGlobalSetting('plan_upgrade_message', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="🔒 This feature requires a paid plan. Please upgrade to access this feature."
            />
            <p className="text-xs text-gray-500 mt-1">Message shown when free users try to access paid features</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Save to Favorites Message
            </label>
            <input
              type="text"
              value={globalSettings.save_to_favorites_message || ''}
              onChange={(e) => updateGlobalSetting('save_to_favorites_message', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="⭐ Please save this video to favorites before using this feature."
            />
            <p className="text-xs text-gray-500 mt-1">Message shown when users try to use features without saving video to favorites</p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      <div className="mb-8 p-4 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Messages</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption Trim Error Intro
            </label>
            <input
              type="text"
              value={featureGates?.error_messages?.caption_trim_error || ''}
              onChange={(e) => updateErrorMessage('caption_trim_error', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="An internal error has occurred: "
            />
            <p className="text-xs text-gray-500 mt-1">Intro text shown before caption trimming error details</p>
          </div>
        </div>
      </div>

      {/* Daily Limits */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Limits</h3>
        <div className="space-y-6">
          {/* Daily Search Limits */}
          <div>
            <h4 className="text-md font-medium text-blue-900 mb-3">Daily Search Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Freebird (Free)
                </label>
                <input
                  type="number"
                  value={featureGates?.daily_search_limits?.freebird || 8}
                  onChange={(e) => updateDailyLimit('daily_search_limits', 'freebird', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-blue-600 mt-1">searches per day</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Roadie
                </label>
                <input
                  type="number"
                  value={featureGates?.daily_search_limits?.roadie || 24}
                  onChange={(e) => updateDailyLimit('daily_search_limits', 'roadie', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-blue-600 mt-1">searches per day</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Hero
                </label>
                <input
                  type="number"
                  value={featureGates?.daily_search_limits?.hero || 100}
                  onChange={(e) => updateDailyLimit('daily_search_limits', 'hero', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-blue-600 mt-1">searches per day</p>
              </div>
            </div>
          </div>

          {/* Daily Watch Time Limits */}
          <div>
            <h4 className="text-md font-medium text-blue-900 mb-3">Daily Watch Time Limits (minutes)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Freebird (Free)
                </label>
                <input
                  type="number"
                  value={featureGates?.daily_watch_time_limits?.freebird || 60}
                  onChange={(e) => updateDailyLimit('daily_watch_time_limits', 'freebird', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-blue-600 mt-1">minutes per day</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Roadie
                </label>
                <input
                  type="number"
                  value={featureGates?.daily_watch_time_limits?.roadie || 180}
                  onChange={(e) => updateDailyLimit('daily_watch_time_limits', 'roadie', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-blue-600 mt-1">minutes per day</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Hero
                </label>
                <input
                  type="number"
                  value={featureGates?.daily_watch_time_limits?.hero || 480}
                  onChange={(e) => updateDailyLimit('daily_watch_time_limits', 'hero', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-blue-600 mt-1">minutes per day</p>
              </div>
            </div>
          </div>

          {/* Favorite Limits */}
          <div>
            <h4 className="text-md font-medium text-blue-900 mb-3">Favorite Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Freebird (Free)
                </label>
                <input
                  type="number"
                  value={featureGates?.favorite_limits?.freebird || 0}
                  onChange={(e) => updateDailyLimit('favorite_limits', 'freebird', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-blue-600 mt-1">favorites saved</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Roadie
                </label>
                <input
                  type="number"
                  value={featureGates?.favorite_limits?.roadie || 12}
                  onChange={(e) => updateDailyLimit('favorite_limits', 'roadie', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-blue-600 mt-1">favorites saved</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Hero
                </label>
                <input
                  type="number"
                  value={featureGates?.favorite_limits?.hero || -1}
                  onChange={(e) => updateDailyLimit('favorite_limits', 'hero', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="-1"
                />
                <p className="text-xs text-blue-600 mt-1">favorites saved (-1 = unlimited)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature List */}
      <div className="space-y-6">
        {Object.entries(features).map(([featureKey, feature]) => (
          <div key={featureKey} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{feature.display_name}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={feature.is_enabled}
                    onChange={(e) => updateFeature(featureKey, { is_enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tier Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Tiers
                </label>
                <div className="space-y-2">
                  {['freebird', 'roadie', 'hero'].map(tier => (
                    <label key={tier} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={feature.required_tiers?.includes(tier) || false}
                        onChange={(e) => {
                          const currentTiers = feature.required_tiers || []
                          const newTiers = e.target.checked
                            ? [...currentTiers, tier]
                            : currentTiers.filter(t => t !== tier)
                          updateFeature(featureKey, { required_tiers: newTiers })
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 capitalize">{tier}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Upgrade Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upgrade Message
                </label>
                <textarea
                  value={feature.upgrade_message || ''}
                  onChange={(e) => updateFeature(featureKey, { upgrade_message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Message shown to users who don't have access to this feature"
                />
              </div>
            </div>

            {/* Video Restriction */}
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={feature.video_restricted}
                  onChange={(e) => updateFeature(featureKey, { video_restricted: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Restricted while video playing</span>
              </label>
            </div>

            {/* Messages Section */}
            {feature.messages && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Custom Messages</h5>
                <div className="space-y-2">
                  {feature.messages.tier_restriction && (
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">
                        Tier Restriction Message
                      </label>
                      <input
                        type="text"
                        value={feature.messages.tier_restriction}
                        onChange={(e) => updateFeature(featureKey, {
                          messages: {
                            ...feature.messages,
                            tier_restriction: e.target.value
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  {feature.messages.video_playing && (
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">
                        Video Playing Message
                      </label>
                      <input
                        type="text"
                        value={feature.messages.video_playing}
                        onChange={(e) => updateFeature(featureKey, {
                          messages: {
                            ...feature.messages,
                            video_playing: e.target.value
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upgrade Button Settings */}
            {feature.upgrade_button && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <h5 className="text-sm font-medium text-green-900 mb-2">Upgrade Button</h5>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={feature.upgrade_button.enabled}
                      onChange={(e) => updateFeature(featureKey, {
                        upgrade_button: {
                          ...feature.upgrade_button,
                          enabled: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    <span className="text-xs text-green-700">Show upgrade button</span>
                  </div>
                  {feature.upgrade_button.enabled && (
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Button Text
                      </label>
                      <input
                        type="text"
                        value={feature.upgrade_button.text}
                        onChange={(e) => updateFeature(featureKey, {
                          upgrade_button: {
                            ...feature.upgrade_button,
                            text: e.target.value
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-green-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={saveFeatureGates}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving Changes...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}
