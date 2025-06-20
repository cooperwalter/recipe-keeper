import { test, expect } from '@playwright/test'
import { testRecipe } from './helpers/test-recipe'

test.describe('Ingredient Adjustment', () => {
  test('shows adjusters only at 1x scale', async ({ page }) => {
    // Set up request mocking BEFORE navigation
    await page.route('**/auth/v1/**', async (route) => {
      // Mock auth endpoints
      if (route.request().url().includes('/user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-123',
            email: 'test@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            user: { id: 'test-user-123', email: 'test@example.com' }
          })
        })
      }
    })

    // Mock the recipe API
    await page.route('**/api/recipes/test-recipe-id', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(testRecipe)
      })
    })

    // Mock ingredient updates
    await page.route('**/api/recipes/test-recipe-id/ingredients/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'ing-1', amount: body.amount.toString() })
        })
      }
    })

    // Set auth in localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          expires_at: Date.now() + 3600000,
          user: { id: 'test-user-123', email: 'test@example.com' }
        },
        expiresAt: Date.now() + 3600000
      }))
    })

    // Navigate to the recipe page
    await page.goto('/protected/recipes/test-recipe-id', { waitUntil: 'networkidle' })

    // Wait for React to hydrate
    await page.waitForTimeout(2000)

    // Debug: Take screenshot
    await page.screenshot({ path: 'test-results/recipe-page.png' })

    // Look for any heading that contains "Test Recipe"
    const heading = await page.locator('h1, h2, h3').filter({ hasText: 'Test Recipe' }).first()
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Find ingredients section
    await expect(page.locator('text=Ingredients')).toBeVisible()

    // Look for the flour ingredient
    const flourText = await page.locator('text=/flour/i').first()
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