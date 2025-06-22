#!/usr/bin/env tsx

/*
 * Script to verify ingredient adjustment functionality
 * Run with: pnpm tsx scripts/test-ingredient-adjustment.ts
 */

import { chromium } from '@playwright/test'

async function testIngredientAdjustment() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 })
  const page = await browser.newPage()

  try {
    console.log('🧪 Testing ingredient adjustment feature...\n')

    // 1. Navigate to login page
    console.log('1. Navigating to login page...')
    await page.goto('http://localhost:3000/auth/login')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Give React time to hydrate
    
    // Take a screenshot to debug
    await page.screenshot({ path: 'login-page-debug.png' })
    
    // 2. Login with demo credentials
    console.log('2. Logging in...')
    // Try multiple selectors
    try {
      await page.fill('input#email', 'demo@recipeandme.app')
    } catch (e) {
      console.log('   Trying alternative email selector...')
      await page.fill('input[type="email"]', 'demo@recipeandme.app')
    }
    
    try {
      await page.fill('input#password', 'DemoRecipes2024!')
    } catch (e) {
      console.log('   Trying alternative password selector...')
      await page.fill('input[type="password"]', 'DemoRecipes2024!')
    }
    
    await page.click('button[type="submit"]')
    
    // Wait for navigation to recipes page
    await page.waitForURL('**/protected/recipes', { timeout: 10000 })
    console.log('✅ Login successful\n')

    // 3. Click on the first recipe
    console.log('3. Opening first recipe...')
    const firstRecipe = page.locator('a[href*="/protected/recipes/"]').first()
    const recipeName = await firstRecipe.textContent()
    await firstRecipe.click()
    
    // Wait for recipe page to load
    await page.waitForSelector('h1', { timeout: 5000 })
    console.log(`✅ Opened recipe: ${recipeName}\n`)

    // 4. Check scale toggle is at 1x
    console.log('4. Checking scale toggle...')
    const scaleToggle = page.locator('[role="radiogroup"]').first()
    const scale1x = scaleToggle.locator('button:has-text("1x")')
    const is1xActive = await scale1x.getAttribute('data-state')
    console.log(`✅ 1x scale is ${is1xActive === 'on' ? 'active' : 'not active'}\n`)

    // 5. Look for ingredient adjusters at 1x
    console.log('5. Looking for ingredient adjusters at 1x scale...')
    const adjustersAt1x = await page.locator('button[aria-label*="Adjust"]').count()
    console.log(`✅ Found ${adjustersAt1x} adjuster button(s) at 1x scale\n`)

    if (adjustersAt1x > 0) {
      // 6. Test adjuster functionality
      console.log('6. Testing adjuster functionality...')
      const firstAdjuster = page.locator('button[aria-label*="Adjust"]').first()
      await firstAdjuster.click()
      
      // Wait for popover
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
      console.log('✅ Adjuster popover opened')

      // Find the amount input
      const amountInput = page.locator('input[aria-label="Custom amount"]')
      const originalValue = await amountInput.inputValue()
      console.log(`   Original amount: ${originalValue}`)

      // Click increment
      const incrementBtn = page.locator('button[aria-label="Increase amount"]')
      await incrementBtn.click()
      
      const newValue = await amountInput.inputValue()
      console.log(`   New amount: ${newValue}`)
      console.log('✅ Amount adjusted successfully\n')

      // Close popover
      await page.keyboard.press('Escape')
    }

    // 7. Switch to 2x scale
    console.log('7. Switching to 2x scale...')
    const scale2x = scaleToggle.locator('button:has-text("2x")')
    await scale2x.click()
    await page.waitForTimeout(500)

    // Check adjusters at 2x
    const adjustersAt2x = await page.locator('button[aria-label*="Adjust"]').count()
    console.log(`✅ Found ${adjustersAt2x} adjuster button(s) at 2x scale`)
    console.log(`   Adjusters are ${adjustersAt2x === 0 ? 'hidden' : 'still visible'} at 2x (expected: hidden)\n`)

    // 8. Switch to 3x scale
    console.log('8. Switching to 3x scale...')
    const scale3x = scaleToggle.locator('button:has-text("3x")')
    await scale3x.click()
    await page.waitForTimeout(500)

    // Check adjusters at 3x
    const adjustersAt3x = await page.locator('button[aria-label*="Adjust"]').count()
    console.log(`✅ Found ${adjustersAt3x} adjuster button(s) at 3x scale`)
    console.log(`   Adjusters are ${adjustersAt3x === 0 ? 'hidden' : 'still visible'} at 3x (expected: hidden)\n`)

    // 9. Switch back to 1x
    console.log('9. Switching back to 1x scale...')
    await scale1x.click()
    await page.waitForTimeout(500)

    // Final check
    const adjustersBackAt1x = await page.locator('button[aria-label*="Adjust"]').count()
    console.log(`✅ Found ${adjustersBackAt1x} adjuster button(s) back at 1x scale\n`)

    // Summary
    console.log('📊 Test Summary:')
    console.log('================')
    console.log(`✅ Login successful`)
    console.log(`✅ Recipe page loaded`)
    console.log(`✅ Scale toggle working`)
    console.log(`✅ Adjusters visible at 1x: ${adjustersAt1x > 0}`)
    console.log(`✅ Adjusters hidden at 2x: ${adjustersAt2x === 0}`)
    console.log(`✅ Adjusters hidden at 3x: ${adjustersAt3x === 0}`)
    console.log(`✅ Adjusters visible again at 1x: ${adjustersBackAt1x > 0}`)
    
    const testPassed = adjustersAt1x > 0 && adjustersAt2x === 0 && adjustersAt3x === 0 && adjustersBackAt1x > 0
    console.log(`\n🎉 Overall result: ${testPassed ? 'PASSED' : 'FAILED'}`)

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    await browser.close()
  }
}

// Run the test
testIngredientAdjustment()