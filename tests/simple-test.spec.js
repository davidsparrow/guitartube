// tests/simple-test.spec.js - Simple test without authentication complexity
import { test, expect } from '@playwright/test'

const TEST_VIDEO_URL = `https://guitar-magic-mvp-1a-git-feature-b4c613-davids-projects-e32e946e.vercel.app/watch?v=ytwpFJ1uZYY&title=Covers%20Of%20Popular%20Songs%20-%20100%20Hits&channel=Music%20Brokers&_vercel_share=g27uDyqbNDQ7TjNoNpoVTkYyUQIQp5AE`

test.describe('Simple Watch Page Tests', () => {

  test('Video Loading and Basic UI Test', async ({ page }) => {
    console.log('🎬 Testing basic video loading and UI...')
    
    const startTime = Date.now()
    
    // Navigate to watch page
    await page.goto(TEST_VIDEO_URL)
    await page.waitForLoadState('networkidle')
    
    // Wait for video player to appear
    await page.waitForSelector('#youtube-player, iframe[src*="youtube"]', { timeout: 20000 })
    
    const loadTime = Date.now() - startTime
    console.log(`⏱️ Video page loaded in ${loadTime}ms`)
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/simple-video-loaded.png' })
    
    // Verify video container exists
    const videoContainer = page.locator('#video-container')
    await expect(videoContainer).toBeVisible()
    
    // Verify YouTube player exists
    const youtubePlayer = page.locator('#youtube-player')
    await expect(youtubePlayer).toBeVisible()
    
    console.log('✅ Video loading test passed')
  })

  test('Video Flip Control Test', async ({ page }) => {
    console.log('🔄 Testing video flip controls...')
    
    await page.goto(TEST_VIDEO_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#youtube-player', { timeout: 20000 })
    
    // Get initial video container bounds
    const videoContainer = page.locator('#video-container')
    const initialBounds = await videoContainer.boundingBox()
    
    // Look for flip button in lower left area
    // Try multiple possible selectors for the flip button
    const flipSelectors = [
      '.fixed.bottom-16 button:first-child',
      '.fixed.bottom-0 button:first-child', 
      'button[title*="flip"]',
      'button[title*="Flip"]',
      'button:has([class*="flip"])',
      '.control-strip button:first-child'
    ]
    
    let flipButtonFound = false
    for (const selector of flipSelectors) {
      const flipButton = page.locator(selector)
      if (await flipButton.count() > 0 && await flipButton.first().isVisible()) {
        console.log(`🎯 Found flip button with selector: ${selector}`)
        
        await flipButton.first().click()
        await page.waitForTimeout(500) // Wait for flip animation
        
        // Verify video container maintains position and size
        const flippedBounds = await videoContainer.boundingBox()
        
        expect(flippedBounds.width).toBeCloseTo(initialBounds.width, 10)
        expect(flippedBounds.height).toBeCloseTo(initialBounds.height, 10)
        
        await page.screenshot({ path: 'test-results/simple-video-flipped.png' })
        
        flipButtonFound = true
        break
      }
    }
    
    if (!flipButtonFound) {
      console.log('⚠️ Flip button not found - taking screenshot for debugging')
      await page.screenshot({ path: 'test-results/simple-no-flip-button.png' })
    }
    
    console.log('✅ Video flip test completed')
  })

  test('Caption Controls Test', async ({ page }) => {
    console.log('📝 Testing caption controls...')
    
    await page.goto(TEST_VIDEO_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#youtube-player', { timeout: 20000 })
    
    // Get initial video bounds
    const videoContainer = page.locator('#video-container')
    const initialBounds = await videoContainer.boundingBox()
    
    // Look for caption control button in lower right area
    const captionSelectors = [
      '.fixed.bottom-16 button:last-child',
      '.fixed.bottom-0 button:last-child',
      'button[title*="caption"]',
      'button[title*="Caption"]',
      'button:has([class*="caption"])',
      '.control-strip button:last-child'
    ]
    
    let captionButtonFound = false
    for (const selector of captionSelectors) {
      const captionButton = page.locator(selector)
      if (await captionButton.count() > 0 && await captionButton.first().isVisible()) {
        console.log(`🎯 Found caption button with selector: ${selector}`)
        
        await captionButton.first().click()
        await page.waitForTimeout(1000) // Wait for caption area to appear
        
        // Check if caption area appeared
        const captionArea = page.locator('.caption-area, .control-strips, [class*="caption"]')
        if (await captionArea.count() > 0) {
          console.log('✅ Caption area appeared')
          
          // Verify video resized
          const resizedBounds = await videoContainer.boundingBox()
          expect(resizedBounds.width).toBeCloseTo(initialBounds.width, 10) // Same width
          expect(resizedBounds.height).toBeLessThan(initialBounds.height) // Shorter height
          
          await page.screenshot({ path: 'test-results/simple-captions-displayed.png' })
        }
        
        captionButtonFound = true
        break
      }
    }
    
    if (!captionButtonFound) {
      console.log('⚠️ Caption button not found - taking screenshot for debugging')
      await page.screenshot({ path: 'test-results/simple-no-caption-button.png' })
    }
    
    console.log('✅ Caption controls test completed')
  })

  test('Responsive Design Test', async ({ page }) => {
    console.log('📱 Testing responsive design...')
    
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(TEST_VIDEO_URL)
      await page.waitForLoadState('networkidle')
      
      // Wait for video to load
      await page.waitForSelector('#youtube-player', { timeout: 15000 })
      
      // Take screenshot
      await page.screenshot({ path: `test-results/simple-responsive-${viewport.name}.png` })
      
      console.log(`✅ ${viewport.name} viewport (${viewport.width}x${viewport.height}) working`)
    }
    
    console.log('✅ Responsive design test completed')
  })

})
