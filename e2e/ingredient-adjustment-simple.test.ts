import { test, expect } from '@playwright/test'
import { mockAuthentication } from './helpers/auth'

test.describe('Ingredient Adjustment Feature', () => {
  test('adjusters only show at 1x scale and update recipe directly', async ({ page }) => {
    // Set up authentication
    await mockAuthentication(page)

    // Mock the recipe API endpoint
    await page.route('**/api/recipes/test-recipe-id', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-recipe-id',
          title: 'Test Recipe',
          description: 'A test recipe',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          createdBy: 'test-user-123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublic: false,
          isFavorite: false,
          version: 1,
          ingredients: [
            {
              id: 'ing-1',
              recipeId: 'test-recipe-id',
              ingredient: 'flour',
              amount: '2',
              unit: 'cups',
              orderIndex: 0,
              notes: null,
              createdAt: new Date().toISOString()
            },
            {
              id: 'ing-2',
              recipeId: 'test-recipe-id',
              ingredient: 'salt',
              amount: null,
              unit: null,
              orderIndex: 1,
              notes: 'to taste',
              createdAt: new Date().toISOString()
            }
          ],
          instructions: [
            {
              id: 'inst-1',
              recipeId: 'test-recipe-id',
              stepNumber: 1,
              instruction: 'Mix ingredients',
              createdAt: new Date().toISOString()
            }
          ],
          photos: [],
          tags: [],
          categories: []
        })
      })
    })

    // Mock the ingredient update endpoint
    let updatedAmount = '2'
    await page.route('**/api/recipes/test-recipe-id/ingredients/ing-1', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}')
        updatedAmount = body.amount.toString()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ing-1',
            amount: updatedAmount
          })
        })
      }
    })

    // Navigate to the recipe page
    await page.goto('/protected/recipes/test-recipe-id')

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
    const flourIngredient = page.locator('text=/2 cups flour/')
    await expect(flourIngredient).toBeVisible()

    // Find the adjuster button for flour (should be visible at 1x)
    const adjusterButton = page.locator('button[aria-label*="Adjust"]').first()
    await expect(adjusterButton).toBeVisible()

    // Click to open adjuster popover
    await adjusterButton.click()

    // Wait for popover
    const popoverTitle = page.locator('h4:has-text("Adjust flour")')
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
    await expect(page.locator('text=/2.25 cups flour|2 ¼ cups flour/')).toBeVisible()

    // Switch to 2x scale
    const scale2x = scaleToggle.locator('button:has-text("2x")')
    await scale2x.click()
    await expect(scale2x).toHaveAttribute('data-state', 'on')

    // Adjuster should NOT be visible at 2x
    await expect(adjusterButton).not.toBeVisible()

    // Amount should be doubled (2.25 * 2 = 4.5)
    await expect(page.locator('text=/4.5 cups flour|4 ½ cups flour/')).toBeVisible()

    // Switch back to 1x
    await scale1x.click()
    
    // Adjuster should be visible again
    await expect(adjusterButton).toBeVisible()

    // Amount should be back to 2.25
    await expect(page.locator('text=/2.25 cups flour|2 ¼ cups flour/')).toBeVisible()

    // Verify salt (no amount) has no adjuster
    const saltIngredient = page.locator('text=/salt/')
    await expect(saltIngredient).toBeVisible()
    const saltAdjusters = page.locator('li:has-text("salt") button[aria-label*="Adjust"]')
    await expect(saltAdjusters).toHaveCount(0)
  })
})