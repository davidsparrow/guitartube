// tests/global-setup-direct-auth.js - Direct Supabase authentication bypass
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://guitartube.vercel.app'

// Test user credentials
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'robshackell@gmail.com',
  password: process.env.TEST_USER_PASSWORD || 'Loca1234'
}

async function globalSetup() {
  console.log('🚀 Starting direct authentication setup...')
  
  // Create Supabase client for direct authentication
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ Supabase environment variables not found, using dummy values')
    // Save empty auth state and continue
    const browser = await chromium.launch()
    const context = await browser.newContext()
    await context.storageState({ path: 'tests/auth-state.json' })
    await browser.close()
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    console.log('🔐 Authenticating directly with Supabase...')
    
    // Authenticate directly with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
    
    if (authError) {
      console.log('❌ Direct authentication failed:', authError.message)
      throw authError
    }
    
    console.log('✅ Direct authentication successful')
    console.log('👤 User ID:', authData.user.id)
    console.log('📧 Email:', authData.user.email)
    
    // Launch browser and inject the session
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Navigate to the site first
    await page.goto(SITE_URL)
    await page.waitForLoadState('networkidle')
    
    // Inject the Supabase session into localStorage
    await page.evaluate((session) => {
      // Set the Supabase session in localStorage
      const supabaseKey = `sb-${window.location.hostname.replace(/\./g, '-')}-auth-token`
      localStorage.setItem(supabaseKey, JSON.stringify(session))
      
      // Also set it with the standard key format
      localStorage.setItem('supabase.auth.token', JSON.stringify(session))
    }, authData.session)
    
    console.log('💾 Session injected into browser storage')
    
    // Refresh the page to pick up the authentication
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Save the authenticated browser state
    await context.storageState({ path: 'tests/auth-state.json' })
    console.log('💾 Authenticated state saved to auth-state.json')
    
    await browser.close()
    
    // Sign out from Supabase to clean up
    await supabase.auth.signOut()
    
    console.log('🎉 Direct authentication setup completed successfully')
    
  } catch (error) {
    console.error('❌ Direct authentication setup failed:', error)
    
    // Create empty auth state as fallback
    const browser = await chromium.launch()
    const context = await browser.newContext()
    await context.storageState({ path: 'tests/auth-state.json' })
    await browser.close()
    
    throw error
  }
}

export default globalSetup
