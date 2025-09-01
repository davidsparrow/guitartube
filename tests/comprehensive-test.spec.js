// tests/comprehensive-test.spec.js - Complete test suite with all modals and interactions
import { test, expect } from '@playwright/test'

const TEST_VIDEO_URL = `https://guitar-magic-mvp-1a-git-feature-b4c613-davids-projects-e32e946e.vercel.app/watch?v=ytwpFJ1uZYY&title=Covers%20Of%20Popular%20Songs%20-%20100%20Hits&channel=Music%20Brokers&_vercel_share=g27uDyqbNDQ7TjNoNpoVTkYyUQIQp5AE`

test.describe('Comprehensive Watch Page Tests', () => {

  test('Complete User Flow - All Critical Interactions', async ({ page }) => {
    console.log('🎬 Starting comprehensive user flow test...')
    
    const startTime = Date.now()
    
    // 1. Navigate and load video
    await page.goto(TEST_VIDEO_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#video-container, [data-testid="video-container"]', { timeout: 20000 })
    
    const loadTime = Date.now() - startTime
    console.log(`⏱️ Video page loaded in ${loadTime}ms`)
    
    // Baseline screenshot - video loaded
    await page.screenshot({ path: 'test-results/comprehensive-01-video-loaded.png' })
    
    // 2. Test video flip control
    console.log('🔄 Testing video flip control...')
    const flipButton = page.locator('[data-testid="video-flip-button"], .fixed.bottom-0 button:first-child')
    await expect(flipButton.first()).toBeVisible()

    // Get initial video bounds
    const videoContainer = page.locator('#video-container, [data-testid="video-container"]')
    const initialBounds = await videoContainer.boundingBox()
    
    // Click flip button
    await flipButton.first().click()
    await page.waitForTimeout(500)
    
    // Verify video maintains position
    const flippedBounds = await videoContainer.boundingBox()
    expect(flippedBounds.width).toBeCloseTo(initialBounds.width, 10)
    expect(flippedBounds.height).toBeCloseTo(initialBounds.height, 10)
    
    // Screenshot after flip
    await page.screenshot({ path: 'test-results/comprehensive-02-video-flipped.png' })
    
    // 3. Open caption controls
    console.log('📝 Opening caption controls...')
    const captionToggle = page.locator('[data-testid="caption-controls-toggle"], .fixed.bottom-0 button:last-child')
    await expect(captionToggle.first()).toBeVisible()

    await captionToggle.first().click()
    await page.waitForTimeout(1000)
    
    // Wait for caption rows to appear (the fixed bottom container)
    await page.waitForSelector('.fixed.bottom-16.left-0.right-0', { timeout: 5000 })
    
    // Screenshot with caption controls open
    await page.screenshot({ path: 'test-results/comprehensive-03-captions-open.png' })
    
    // Verify video resized correctly
    const resizedBounds = await videoContainer.boundingBox()
    expect(resizedBounds.width).toBeCloseTo(initialBounds.width, 10) // Same width
    expect(resizedBounds.height).toBeLessThan(initialBounds.height) // Shorter height
    
    console.log('✅ Caption controls opened successfully')
    
    // 4. Test text caption edit modal
    console.log('📝 Testing text caption edit modal...')
    const textCaptionEdit = page.locator('[data-testid="text-caption-edit"], .control-strips .caption-row:first-child button:last-child')

    // Wait for the button to be visible and clickable
    await expect(textCaptionEdit.first()).toBeVisible({ timeout: 5000 })
    await textCaptionEdit.first().click()
    
    // Wait for modal to open
    await page.waitForSelector('.modal, [role="dialog"], .caption-modal', { timeout: 10000 })
    
    // Screenshot of text caption modal
    await page.screenshot({ path: 'test-results/comprehensive-04-text-caption-modal.png' })
    
    // Close modal - look for Cancel button
    const cancelButton = page.locator('button:has-text("Cancel"), [data-testid="cancel-button"]')
    if (await cancelButton.count() > 0) {
      await cancelButton.click()
      
      // Look for confirmation button
      const confirmButton = page.locator('button:has-text("PROCEED"), button:has-text("OK"), [data-testid="confirm-button"]')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
      }
    }
    
    console.log('✅ Text caption modal test completed')
    
    // 5. Test chord caption edit modal
    console.log('🎸 Testing chord caption edit modal...')
    const chordCaptionEdit = page.locator('[data-testid="chord-caption-edit"], .control-strips .caption-row:nth-child(2) button:last-child')

    // Wait for the button to be visible and clickable
    await expect(chordCaptionEdit.first()).toBeVisible({ timeout: 5000 })
    await chordCaptionEdit.first().click()
    
    // Wait for chord modal to open
    await page.waitForSelector('.modal, [role="dialog"], .chord-modal', { timeout: 10000 })
    
    // Screenshot of chord caption modal
    await page.screenshot({ path: 'test-results/comprehensive-05-chord-caption-modal.png' })
    
    // Close chord modal
    const chordCancelButton = page.locator('button:has-text("Cancel"), [data-testid="cancel-button"]')
    if (await chordCancelButton.count() > 0) {
      await chordCancelButton.click()
      
      // Look for confirmation button
      const chordConfirmButton = page.locator('button:has-text("OK"), button:has-text("PROCEED"), [data-testid="confirm-button"]')
      if (await chordConfirmButton.count() > 0) {
        await chordConfirmButton.click()
      }
    }
    
    console.log('✅ Chord caption modal test completed')
    
    // 6. Final screenshot with captions still open
    await page.screenshot({ path: 'test-results/comprehensive-06-final-state.png' })
    
    console.log('🎉 Comprehensive user flow test completed successfully!')
  })

  test('Responsive Design - All Viewports with Captions', async ({ page }) => {
    console.log('📱 Testing responsive design with caption interactions...')
    
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ]
    
    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} viewport...`)
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(TEST_VIDEO_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('#video-container, [data-testid="video-container"]', { timeout: 15000 })
      
      // Screenshot without captions
      await page.screenshot({ path: `test-results/responsive-${viewport.name}-video-only.png` })
      
      // Open captions if button is visible
      const captionToggle = page.locator('[data-testid="caption-controls-toggle"], .fixed.bottom-0 button:last-child')
      if (await captionToggle.first().isVisible()) {
        await captionToggle.first().click()
        await page.waitForTimeout(1000)
        
        // Screenshot with captions
        await page.screenshot({ path: `test-results/responsive-${viewport.name}-with-captions.png` })
      }
      
      console.log(`✅ ${viewport.name} viewport (${viewport.width}x${viewport.height}) completed`)
    }
    
    console.log('✅ Responsive design test completed')
  })

  test('Performance and Load Time Monitoring', async ({ page }) => {
    console.log('⚡ Testing performance and load times...')
    
    const measurements = []
    
    // Test multiple loads to get average
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now()
      
      await page.goto(TEST_VIDEO_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('#video-container, [data-testid="video-container"]', { timeout: 20000 })
      
      const loadTime = Date.now() - startTime
      measurements.push(loadTime)
      
      console.log(`🔄 Load ${i + 1}: ${loadTime}ms`)
    }
    
    const averageLoadTime = measurements.reduce((a, b) => a + b, 0) / measurements.length
    console.log(`📊 Average load time: ${averageLoadTime.toFixed(0)}ms`)
    
    // Assert reasonable performance
    expect(averageLoadTime).toBeLessThan(10000) // 10 seconds max
    
    // Take final performance screenshot
    await page.screenshot({ path: 'test-results/performance-final-load.png' })
    
    console.log('✅ Performance test completed')
  })

})
