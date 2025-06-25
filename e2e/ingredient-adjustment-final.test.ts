import { test, expect } from '@playwright/test'
import { setupAPIMocks } from './helpers/mock-api'

test.describe('Ingredient Adjustment', () => {
  test('shows adjusters only at 1x scale', async ({ page }) => {
    // Set up API mocks
    await setupAPIMocks(page)

    // Navigate to the recipe page
    await page.goto('/protected/recipes/test-recipe-123', { waitUntil: 'networkidle' })

    // Wait for React to hydrate
    await page.waitForTimeout(2000)

    // Debug: Take screenshot
    await page.screenshot({ path: 'test-results/recipe-page.png' })

    // Look for the recipe title
    const heading = await page.locator('h1').filter({ hasText: 'Test Recipe' }).first()
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Find ingredients section
    await expect(page.locator('text=Ingredients')).toBeVisible()

    // Look for the flour ingredient
    const flourText = await page.locator('text=/Flour/i').first()
    await expect(flourText).toBeVisible()

    // Find adjuster button (should be visible at 1x)
    const adjusters = await page.locator('button[aria-label*="Adjust"]').all()
    expect(adjusters.length).toBeGreaterThan(0)

    // Find scale toggle
    const scaleButtons = await page.locator('button').filter({ hasText: /^[123]x$/ }).all()
    expect(scaleButtons.length).toBe(3)

    // Verify 1x is selected
    const scale1x = page.locator('button').filter({ hasText: '1x' })
    await expect(scale1x).toHaveAttribute('data-state', 'on')

    // Click 2x
    const scale2x = page.locator('button').filter({ hasText: '2x' })
    await scale2x.click()

    // Wait for scale change
    await page.waitForTimeout(500)

    // Adjusters should be hidden at 2x
    const adjustersAt2x = await page.locator('button[aria-label*="Adjust"]').all()
    expect(adjustersAt2x.length).toBe(0)

    // Go back to 1x
    await scale1x.click()
    await page.waitForTimeout(500)

    // Adjusters should be visible again
    const adjustersBackAt1x = await page.locator('button[aria-label*="Adjust"]').all()
    expect(adjustersBackAt1x.length).toBeGreaterThan(0)
  })
})