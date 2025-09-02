// tests/global-setup.js - Global setup for authentication and test data
import { chromium } from '@playwright/test'
import path from 'path'

const SITE_URL = "https://guitartube.vercel.app"

// Test user credentials - REPLACE WITH REAL TEST USER
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'your-test-user@example.com',
  password: process.env.TEST_USER_PASSWORD || 'your-test-password'
}

async function globalSetup() {
  console.log('🚀 Starting global setup...')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    console.log('🔐 Logging in test user...')
    
    // Navigate to site
    await page.goto(SITE_URL)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Look for power button (login) in upper right corner - "Start Me Up" title
    const authButton = page.locator('button[title="Start Me Up"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Get Started"), [data-testid="auth-button"], .auth-button')

    try {
      if (await authButton.first().isVisible({ timeout: 5000 })) {
        await authButton.first().click()

        // Wait for login form
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 })

        // Fill login form
        await page.fill('input[type="email"], input[name="email"]', TEST_USER.email)
        await page.fill('input[type="password"], input[name="password"]', TEST_USER.password)

        // Submit login
        await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')

        // Wait for successful login
        await page.waitForSelector('[data-testid="user-menu"], .user-profile, button:has-text("Logout")', { timeout: 15000 })

        console.log('✅ Test user logged in successfully')
      } else {
        console.log('ℹ️ No login button found - user may already be logged in')
      }
    } catch (error) {
      console.log('⚠️ Login process failed:', error.message)
      console.log('📸 Taking screenshot for debugging...')
      await page.screenshot({ path: 'test-results/debug-login.png' })
    }
    
    // Save authentication state
    await context.storageState({ path: 'tests/auth-state.json' })
    console.log('💾 Authentication state saved')
    
    // Navigate to test video and favorite it if needed
    console.log('⭐ Ensuring test video is favorited...')
    await page.goto(`https://guitartube.vercel.app/watch?v=ytwpFJ1uZYY&title=Covers%20Of%20Popular%20Songs%20-%20100%20Hits&channel=Music%20Brokers`)

    // Wait for page to load first
    await page.waitForLoadState('networkidle')

    // Wait for video container or YouTube player to appear (more flexible selectors)
    try {
      await page.waitForSelector('#youtube-player, iframe[src*="youtube"], #video-container, .video-container', { timeout: 20000 })
      console.log('✅ Video player found')
    } catch (error) {
      console.log('⚠️ Video player not found, continuing anyway...')
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/debug-video-load.png' })
    }
    
    // Look for favorite button and click if not favorited
    const favoriteButton = page.locator('button:has-text("♡"), button:has-text("♥"), [data-testid="favorite-button"]')
    
    if (await favoriteButton.isVisible()) {
      const buttonText = await favoriteButton.textContent()
      
      // If showing empty heart, click to favorite
      if (buttonText && buttonText.includes('♡')) {
        await favoriteButton.click()
        await page.waitForTimeout(2000) // Wait for favorite action
        console.log('✅ Test video favorited')
      } else {
        console.log('ℹ️ Test video already favorited')
      }
    }
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
  
  console.log('🎉 Global setup completed successfully')
}

export default globalSetup
