import { test, expect } from '@playwright/test'
import { mockAuthentication } from './helpers/auth'
import { setupAPIMocks } from './helpers/mock-api'

test.describe('Simple Navigation Test', () => {
  test('can navigate to recipe page', async ({ page }) => {
    // Set up authentication and API mocks
    await mockAuthentication(page)
    await setupAPIMocks(page)

    // Go directly to the recipe page
    await page.goto('/protected/recipes/test-recipe-123')

    // Wait for any loading to complete
    await page.waitForLoadState('networkidle')

    // Debug: Take a screenshot
    await page.screenshot({ path: 'recipe-page.png' })

    // Check if we're on the recipe page by looking for common elements
    const bodyText = await page.textContent('body')
    console.log('Page body contains:', bodyText?.substring(0, 500))

    // Look for any heading
    const headings = await page.locator('h1, h2, h3').all()
    console.log('Found headings:', headings.length)
    
    for (const heading of headings) {
      console.log('Heading text:', await heading.textContent())
    }

    // Check for recipe title
    await expect(page.locator('text=Test Recipe').first()).toBeVisible({ timeout: 10000 })
  })
})