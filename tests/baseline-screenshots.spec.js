// tests/baseline-screenshots.spec.js - Capture baseline screenshots of current functionality
import { test, expect } from '@playwright/test'

const TEST_VIDEO_URL = `https://guitar-magic-mvp-1a-git-feature-b4c613-davids-projects-e32e946e.vercel.app/watch?v=ytwpFJ1uZYY&title=Covers%20Of%20Popular%20Songs%20-%20100%20Hits&channel=Music%20Brokers&_vercel_share=g27uDyqbNDQ7TjNoNpoVTkYyUQIQp5AE`

test.describe('Baseline Screenshots - Current Functionality', () => {

  test('Capture All Current UI States', async ({ page }) => {
    console.log('📸 Capturing baseline screenshots of current functionality...')
    
    // 1. Navigate and load video
    await page.goto(TEST_VIDEO_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#video-container', { timeout: 20000 })
    
    console.log('✅ Video loaded successfully')
    
    // Baseline screenshot - video loaded
    await page.screenshot({ 
      path: 'test-results/baseline-01-video-loaded.png',
      fullPage: true 
    })
    
    // 2. Test video flip control
    console.log('🔄 Testing video flip control...')
    const flipButton = page.locator('.fixed.bottom-0 button:first-child')
    
    if (await flipButton.count() > 0 && await flipButton.first().isVisible()) {
      await flipButton.first().click()
      await page.waitForTimeout(500)
      
      // Screenshot after flip
      await page.screenshot({ 
        path: 'test-results/baseline-02-video-flipped.png',
        fullPage: true 
      })
      console.log('✅ Video flip control working')
    } else {
      console.log('⚠️ Flip button not found')
    }
    
    // 3. Try caption controls
    console.log('📝 Testing caption controls...')
    const captionToggle = page.locator('.fixed.bottom-0 button:last-child')
    
    if (await captionToggle.count() > 0 && await captionToggle.first().isVisible()) {
      console.log('🎯 Found caption toggle button')
      
      // Take screenshot before clicking
      await page.screenshot({ 
        path: 'test-results/baseline-03-before-caption-click.png',
        fullPage: true 
      })
      
      await captionToggle.first().click()
      await page.waitForTimeout(2000) // Wait longer for any animations
      
      // Take screenshot after clicking (regardless of what appears)
      await page.screenshot({ 
        path: 'test-results/baseline-04-after-caption-click.png',
        fullPage: true 
      })
      
      // Check if any new elements appeared
      const possibleCaptionSelectors = [
        '.fixed.bottom-16',
        '[class*="control-strip"]',
        '[class*="caption"]',
        '.z-40',
        'div[style*="bottom"]'
      ]
      
      let captionAreaFound = false
      for (const selector of possibleCaptionSelectors) {
        const elements = await page.locator(selector).count()
        if (elements > 0) {
          console.log(`✅ Found elements with selector "${selector}": ${elements}`)
          captionAreaFound = true
        }
      }
      
      if (!captionAreaFound) {
        console.log('⚠️ No caption area found - might require authentication')
        
        // Check for any authentication indicators
        const authSelectors = [
          'button[title="Start Me Up"]',
          'button:has-text("Login")',
          'button:has-text("Sign In")',
          '.auth-button'
        ]
        
        for (const selector of authSelectors) {
          const authElements = await page.locator(selector).count()
          if (authElements > 0) {
            console.log(`🔐 Found auth element: "${selector}" (${authElements} elements)`)
          }
        }
      }
      
    } else {
      console.log('⚠️ Caption toggle button not found')
    }
    
    // 4. Test different viewport sizes
    console.log('📱 Testing responsive design...')
    
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(1000) // Wait for responsive changes
      
      await page.screenshot({ 
        path: `test-results/baseline-responsive-${viewport.name}.png`,
        fullPage: true 
      })
      
      console.log(`✅ ${viewport.name} viewport captured`)
    }
    
    // 5. Check page elements and structure
    console.log('🔍 Analyzing page structure...')
    
    // Count various elements
    const elementCounts = {
      buttons: await page.locator('button').count(),
      videos: await page.locator('video, iframe[src*="youtube"]').count(),
      modals: await page.locator('.modal, [role="dialog"]').count(),
      fixedElements: await page.locator('.fixed').count()
    }
    
    console.log('📊 Page structure analysis:')
    console.log(`   - Buttons: ${elementCounts.buttons}`)
    console.log(`   - Video elements: ${elementCounts.videos}`)
    console.log(`   - Modals: ${elementCounts.modals}`)
    console.log(`   - Fixed positioned elements: ${elementCounts.fixedElements}`)
    
    // Get all button text content for debugging
    const buttonTexts = await page.locator('button').allTextContents()
    console.log('🔘 Button texts found:', buttonTexts.slice(0, 10)) // First 10 only
    
    // Final screenshot at desktop size
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({ 
      path: 'test-results/baseline-final-state.png',
      fullPage: true 
    })
    
    console.log('🎉 Baseline screenshot capture completed!')
  })

  test('Performance Baseline', async ({ page }) => {
    console.log('⚡ Measuring performance baseline...')
    
    const measurements = []
    
    // Test 3 loads to get average
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now()
      
      await page.goto(TEST_VIDEO_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('#video-container', { timeout: 20000 })
      
      const loadTime = Date.now() - startTime
      measurements.push(loadTime)
      
      console.log(`🔄 Load ${i + 1}: ${loadTime}ms`)
    }
    
    const averageLoadTime = measurements.reduce((a, b) => a + b, 0) / measurements.length
    const minLoadTime = Math.min(...measurements)
    const maxLoadTime = Math.max(...measurements)
    
    console.log(`📊 Performance Results:`)
    console.log(`   - Average: ${averageLoadTime.toFixed(0)}ms`)
    console.log(`   - Fastest: ${minLoadTime}ms`)
    console.log(`   - Slowest: ${maxLoadTime}ms`)
    
    // Assert reasonable performance
    expect(averageLoadTime).toBeLessThan(10000) // 10 seconds max
    expect(minLoadTime).toBeLessThan(8000) // 8 seconds for fastest
    
    console.log('✅ Performance baseline established')
  })

})
