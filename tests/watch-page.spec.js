// tests/watch-page.spec.js - Automated testing for watch.js page
import { test, expect } from '@playwright/test'

// Test configuration
const SITE_URL = "https://guitartube.vercel.app"
const TEST_VIDEO_URL = `https://guitartube.vercel.app/watch?v=ytwpFJ1uZYY&title=Covers%20Of%20Popular%20Songs%20-%20100%20Hits&channel=Music%20Brokers`

// Test data - you'll need to provide real credentials
const TEST_USER = {
  email: 'your-test-user@example.com', // Replace with real test user
  password: 'your-test-password'        // Replace with real test password
}

// Helper function to login user
async function loginUser(page) {
  // Navigate to login
  await page.goto(SITE_URL)
  
  // Click login/auth button (adjust selector based on your UI)
  await page.click('[data-testid="auth-button"], .auth-button, button:has-text("Login")')
  
  // Fill login form
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  
  // Submit login
  await page.click('button[type="submit"], button:has-text("Sign In")')
  
  // Wait for login to complete
  await page.waitForSelector('[data-testid="user-menu"], .user-profile', { timeout: 10000 })
}

// Helper function to favorite video (if not already favorited)
async function ensureVideoFavorited(page) {
  // Look for favorite button and click if not already favorited
  const favoriteButton = page.locator('[data-testid="favorite-button"], button:has-text("♡"), button:has-text("♥")')
  
  if (await favoriteButton.isVisible()) {
    // Check if already favorited (look for filled heart or different styling)
    const isFavorited = await favoriteButton.evaluate(el => 
      el.textContent.includes('♥') || el.classList.contains('favorited')
    )
    
    if (!isFavorited) {
      await favoriteButton.click()
      // Wait for favorite action to complete
      await page.waitForTimeout(1000)
    }
  }
}

test.describe('Watch Page Critical User Flows', () => {

  // Authentication is handled by global setup, so no beforeEach needed

  test('Video Loading Performance Test', async ({ page }) => {
    console.log('🎬 Testing video loading performance...')
    
    const startTime = Date.now()
    
    // Navigate to watch page
    await page.goto(TEST_VIDEO_URL)
    
    // Wait for video player to be ready
    await page.waitForSelector('#youtube-player, iframe[src*="youtube"]', { timeout: 15000 })
    
    const loadTime = Date.now() - startTime
    console.log(`⏱️ Video page loaded in ${loadTime}ms`)
    
    // Assert reasonable load time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000) // 10 seconds max
    
    // Ensure video is favorited for subsequent tests
    await ensureVideoFavorited(page)
    
    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('video-loaded-desktop.png')
  })

  test('Video Flip/Rotate Control Test', async ({ page }) => {
    console.log('🔄 Testing video flip/rotate controls...')
    
    await page.goto(TEST_VIDEO_URL)
    await page.waitForSelector('#youtube-player, iframe[src*="youtube"]', { timeout: 15000 })
    await ensureVideoFavorited(page)
    
    // Get initial video container position/size
    const videoContainer = page.locator('#video-container, .video-container')
    const initialBounds = await videoContainer.boundingBox()
    
    // Find and click video flip control (lower left corner)
    const flipButton = page.locator('[data-testid="flip-button"], button:has([class*="flip"]), button:has([class*="rotate"])')
    
    // If flip button not found by data-testid, try icon-based selectors
    if (!(await flipButton.isVisible())) {
      // Look for flip icon in lower left area
      await page.click('.fixed.bottom-0 button:first-child, .control-strip button:first-child')
    } else {
      await flipButton.click()
    }
    
    // Wait for flip animation to complete
    await page.waitForTimeout(500)
    
    // Verify video container maintains position and size
    const flippedBounds = await videoContainer.boundingBox()
    
    expect(flippedBounds.width).toBeCloseTo(initialBounds.width, 10)
    expect(flippedBounds.height).toBeCloseTo(initialBounds.height, 10)
    expect(flippedBounds.x).toBeCloseTo(initialBounds.x, 10)
    expect(flippedBounds.y).toBeCloseTo(initialBounds.y, 10)
    
    // Take screenshot to verify visual state
    await expect(page).toHaveScreenshot('video-flipped.png')
    
    console.log('✅ Video flip control working correctly')
  })

  test('Caption Controls Display Test', async ({ page }) => {
    console.log('📝 Testing caption controls display...')
    
    await page.goto(TEST_VIDEO_URL)
    await page.waitForSelector('#youtube-player, iframe[src*="youtube"]', { timeout: 15000 })
    await ensureVideoFavorited(page)
    
    // Get initial video size
    const videoContainer = page.locator('#video-container, .video-container')
    const initialBounds = await videoContainer.boundingBox()
    
    // Find and click caption control display button (lower right)
    const captionToggle = page.locator('[data-testid="caption-toggle"], [data-testid="control-strips-toggle"]')
    
    if (!(await captionToggle.isVisible())) {
      // Look for caption control in lower right area
      await page.click('.fixed.bottom-0 button:last-child, .control-strip button:last-child')
    } else {
      await captionToggle.click()
    }
    
    // Wait for caption area to appear
    await page.waitForSelector('.caption-area, .control-strips, [class*="caption"]', { timeout: 5000 })
    
    // Verify video resized and stayed full width
    const resizedBounds = await videoContainer.boundingBox()
    
    // Video should maintain full width
    expect(resizedBounds.width).toBeCloseTo(initialBounds.width, 10)
    
    // Video should be shorter (caption area appeared below)
    expect(resizedBounds.height).toBeLessThan(initialBounds.height)
    
    // Take screenshot for visual verification
    await expect(page).toHaveScreenshot('captions-displayed.png')
    
    console.log('✅ Caption controls display working correctly')
  })

  test('Text Caption Edit Modal Test', async ({ page }) => {
    console.log('📝 Testing text caption edit modal...')
    
    await page.goto(TEST_VIDEO_URL)
    await page.waitForSelector('#youtube-player, iframe[src*="youtube"]', { timeout: 15000 })
    await ensureVideoFavorited(page)
    
    // Open caption controls first
    await page.click('.fixed.bottom-0 button:last-child, [data-testid="control-strips-toggle"]')
    await page.waitForSelector('.caption-area, .control-strips', { timeout: 5000 })
    
    // Find text caption edit button (list icon in top row, far right)
    const textCaptionEditButton = page.locator('[data-testid="text-caption-edit"], .caption-row:first-child button:last-child')
    
    if (!(await textCaptionEditButton.isVisible())) {
      // Look for list icon in first caption row
      await page.click('.control-strips .caption-row:first-child [class*="list"], .control-strips .caption-row:first-child button:has([class*="list"])')
    } else {
      await textCaptionEditButton.click()
    }
    
    // Wait for modal to open
    await page.waitForSelector('.modal, [role="dialog"], .caption-modal', { timeout: 5000 })
    
    // Verify modal is centered and displays caption records
    const modal = page.locator('.modal, [role="dialog"], .caption-modal')
    await expect(modal).toBeVisible()
    
    // Take screenshot of modal
    await expect(page).toHaveScreenshot('text-caption-modal.png')
    
    // Click Cancel button
    await page.click('button:has-text("Cancel"), [data-testid="cancel-button"]')
    
    // Click PROCEED to confirm close
    await page.click('button:has-text("PROCEED"), button:has-text("OK"), [data-testid="confirm-button"]')
    
    // Verify modal closed
    await expect(modal).not.toBeVisible()
    
    console.log('✅ Text caption modal working correctly')
  })

  test('Chord Caption Edit Modal Test', async ({ page }) => {
    console.log('🎸 Testing chord caption edit modal...')
    
    await page.goto(TEST_VIDEO_URL)
    await page.waitForSelector('#youtube-player, iframe[src*="youtube"]', { timeout: 15000 })
    await ensureVideoFavorited(page)
    
    // Open caption controls first
    await page.click('.fixed.bottom-0 button:last-child, [data-testid="control-strips-toggle"]')
    await page.waitForSelector('.caption-area, .control-strips', { timeout: 5000 })
    
    // Find chord caption edit button (list icon in second row, far right)
    const chordCaptionEditButton = page.locator('[data-testid="chord-caption-edit"], .caption-row:nth-child(2) button:last-child')
    
    if (!(await chordCaptionEditButton.isVisible())) {
      // Look for list icon in second caption row
      await page.click('.control-strips .caption-row:nth-child(2) [class*="list"], .control-strips .caption-row:nth-child(2) button:has([class*="list"])')
    } else {
      await chordCaptionEditButton.click()
    }
    
    // Wait for modal to open
    await page.waitForSelector('.modal, [role="dialog"], .chord-modal', { timeout: 5000 })
    
    // Verify modal displays chord caption records
    const modal = page.locator('.modal, [role="dialog"], .chord-modal')
    await expect(modal).toBeVisible()
    
    // Take screenshot of chord modal
    await expect(page).toHaveScreenshot('chord-caption-modal.png')
    
    // Click Cancel button
    await page.click('button:has-text("Cancel"), [data-testid="cancel-button"]')
    
    // Click OK to confirm close
    await page.click('button:has-text("OK"), button:has-text("PROCEED"), [data-testid="confirm-button"]')
    
    // Verify modal closed
    await expect(modal).not.toBeVisible()
    
    console.log('✅ Chord caption modal working correctly')
  })

  test('Responsive Design Test', async ({ page }) => {
    console.log('📱 Testing responsive design...')
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(TEST_VIDEO_URL)
      await page.waitForSelector('#youtube-player, iframe[src*="youtube"]', { timeout: 15000 })
      
      // Take screenshot for each viewport
      await expect(page).toHaveScreenshot(`responsive-${viewport.name}.png`)
      
      console.log(`✅ ${viewport.name} viewport (${viewport.width}x${viewport.height}) working`)
    }
  })

})
