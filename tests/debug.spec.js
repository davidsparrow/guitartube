// tests/debug.spec.js - Debug test to understand your site structure
import { test, expect } from '@playwright/test'

const SITE_URL = "https://guitartube.vercel.app"
const TEST_VIDEO_URL = `https://guitartube.vercel.app/watch?v=ytwpFJ1uZYY&title=Covers%20Of%20Popular%20Songs%20-%20100%20Hits&channel=Music%20Brokers`

test.describe('Debug Tests', () => {
  
  test('Debug - Explore site structure', async ({ page }) => {
    console.log('🔍 Exploring site structure...')
    
    // Navigate to home page
    await page.goto(SITE_URL)
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of home page
    await page.screenshot({ path: 'test-results/debug-home.png' })
    
    // Log page title
    const title = await page.title()
    console.log('📄 Page title:', title)
    
    // Look for authentication elements
    const authElements = await page.locator('button, a').allTextContents()
    console.log('🔐 Found buttons/links:', authElements.slice(0, 10)) // First 10 only
    
    // Navigate to watch page
    console.log('🎬 Navigating to watch page...')
    await page.goto(TEST_VIDEO_URL)
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of watch page
    await page.screenshot({ path: 'test-results/debug-watch.png' })
    
    // Check what video-related elements exist
    const videoElements = await page.locator('div, iframe, video').count()
    console.log('📺 Found video-related elements:', videoElements)
    
    // Look for specific selectors
    const selectors = [
      '#youtube-player',
      'iframe[src*="youtube"]',
      '#video-container',
      '.video-container',
      '[data-testid="video-player"]',
      '.youtube-player'
    ]
    
    for (const selector of selectors) {
      const exists = await page.locator(selector).count()
      console.log(`🎯 Selector "${selector}": ${exists} elements found`)
    }
    
    // Check for authentication state
    const isLoggedIn = await page.locator('button:has-text("Logout"), .user-profile, [data-testid="user-menu"]').count()
    console.log('👤 Login state indicators found:', isLoggedIn)
    
    // Look for favorite button
    const favoriteButtons = await page.locator('button').allTextContents()
    const heartButtons = favoriteButtons.filter(text => text.includes('♡') || text.includes('♥'))
    console.log('❤️ Heart/favorite buttons found:', heartButtons)
    
    console.log('✅ Debug exploration complete')
  })

  test('Debug - Test authentication flow', async ({ page }) => {
    console.log('🔐 Testing authentication flow...')
    
    await page.goto(SITE_URL)
    await page.waitForLoadState('networkidle')
    
    // Look for any clickable authentication elements
    const authSelectors = [
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'button:has-text("Get Started")',
      'a:has-text("Login")',
      'a:has-text("Sign In")',
      '[data-testid="auth-button"]',
      '.auth-button'
    ]
    
    let authFound = false
    for (const selector of authSelectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        console.log(`✅ Found auth element: "${selector}" (${count} elements)`)
        authFound = true
        
        // Try clicking it
        try {
          await page.locator(selector).first().click()
          await page.waitForTimeout(2000)
          await page.screenshot({ path: 'test-results/debug-auth-clicked.png' })
          console.log('📸 Screenshot taken after clicking auth button')
          break
        } catch (error) {
          console.log(`❌ Failed to click "${selector}":`, error.message)
        }
      }
    }
    
    if (!authFound) {
      console.log('⚠️ No authentication elements found')
      
      // Check if already logged in
      const loggedInSelectors = [
        'button:has-text("Logout")',
        '.user-profile',
        '[data-testid="user-menu"]',
        'button:has-text("Profile")'
      ]
      
      for (const selector of loggedInSelectors) {
        const count = await page.locator(selector).count()
        if (count > 0) {
          console.log(`✅ Already logged in - found: "${selector}"`)
          break
        }
      }
    }
    
    console.log('✅ Authentication flow test complete')
  })

})
