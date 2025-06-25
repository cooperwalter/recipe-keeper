import { test, expect } from '@playwright/test'
import { mockAuthentication } from './helpers/auth'
import { setupAPIMocks } from './helpers/mock-api'

test.describe('Ingredient Adjustment Feature', () => {
  test('adjusters only show at 1x scale and update recipe directly', async ({ page }) => {
    // Set up API mocks
    await setupAPIMocks(page)

    // Mock the ingredient update endpoint
    let updatedAmount = '2'
    await page.route('**/api/recipes/test-recipe-123/ingredients/1', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}')
        updatedAmount = body.amount.toString()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            amount: updatedAmount
          })
        })
      }
    })

    // Navigate to the recipe page
    await page.goto('/protected/recipes/test-recipe-123')

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000) // Give React time to render

    // Check that recipe title loaded
    const title = page.locator('h1').first()
    await expect(title).toContainText('Test Recipe')

    // Find the scale toggle - it should be at 1x by default
    const scaleToggle = page.locator('[role="radiogroup"]').first()
    await expect(scaleToggle).toBeVisible()
    
    const scale1x = scaleToggle.locator('button:has-text("1x")')
    await expect(scale1x).toHaveAttribute('data-state', 'on')

    // Find the flour ingredient
    const flourIngredient = page.locator('text=/2 cups Flour/')
    await expect(flourIngredient).toBeVisible()

    // Find the adjuster button for flour (should be visible at 1x)
    const adjusterButton = page.locator('button[aria-label*="Adjust"]').first()
    await expect(adjusterButton).toBeVisible()

    // Click to open adjuster popover
    await adjusterButton.click()

    // Wait for popover
    const popoverTitle = page.locator('h4:has-text("Adjust Flour")')
    await expect(popoverTitle).toBeVisible()

    // Find the input and change value
    const input = page.locator('input[aria-label="Custom amount"]')
    await expect(input).toHaveValue('2')
    
    // Click increment button
    const incrementBtn = page.locator('button[aria-label="Increase amount"]')
    await incrementBtn.click()
    await expect(input).toHaveValue('2.25')

    // Close popover
    await page.keyboard.press('Escape')

    // Wait for update
    await page.waitForTimeout(500)

    // Verify the ingredient text updated
    await expect(page.locator('text=/2.25 cups Flour|2 ¼ cups Flour/')).toBeVisible()

    // Switch to 2x scale
    const scale2x = scaleToggle.locator('button:has-text("2x")')
    await scale2x.click()
    await expect(scale2x).toHaveAttribute('data-state', 'on')

    // Adjuster should NOT be visible at 2x
    await expect(adjusterButton).not.toBeVisible()

    // Amount should be doubled (2.25 * 2 = 4.5)
    await expect(page.locator('text=/4.5 cups Flour|4 ½ cups Flour/')).toBeVisible()

    // Switch back to 1x
    await scale1x.click()
    
    // Adjuster should be visible again
    await expect(adjusterButton).toBeVisible()

    // Amount should be back to 2.25
    await expect(page.locator('text=/2.25 cups Flour|2 ¼ cups Flour/')).toBeVisible()

    // Verify salt (no amount) has no adjuster
    const saltIngredient = page.locator('text=/Salt/')
    await expect(saltIngredient).toBeVisible()
    const saltAdjusters = page.locator('li:has-text("Salt") button[aria-label*="Adjust"]')
    await expect(saltAdjusters).toHaveCount(0)
  })
})