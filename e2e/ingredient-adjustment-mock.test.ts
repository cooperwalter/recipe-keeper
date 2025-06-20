import { test, expect } from '@playwright/test'

test.describe('Ingredient Adjustment at 1x Scale', () => {
  test('should show ingredient adjuster only at 1x scale', async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/recipes/test-recipe-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-recipe-123',
          title: 'Test Recipe',
          description: 'A test recipe for ingredient adjustments',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          createdBy: 'user-123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublic: false,
          isFavorite: false,
          version: 1,
          ingredients: [
            {
              id: 'ing-1',
              recipeId: 'test-recipe-123',
              ingredient: 'all-purpose flour',
              amount: '2',
              unit: 'cups',
              orderIndex: 0,
              notes: null,
              createdAt: new Date().toISOString()
            },
            {
              id: 'ing-2',
              recipeId: 'test-recipe-123',
              ingredient: 'sugar',
              amount: '0.5',
              unit: 'cup',
              orderIndex: 1,
              notes: null,
              createdAt: new Date().toISOString()
            },
            {
              id: 'ing-3',
              recipeId: 'test-recipe-123',
              ingredient: 'salt',
              amount: null,
              unit: null,
              orderIndex: 2,
              notes: 'to taste',
              createdAt: new Date().toISOString()
            }
          ],
          instructions: [
            {
              id: 'inst-1',
              recipeId: 'test-recipe-123',
              stepNumber: 1,
              instruction: 'Mix dry ingredients',
              createdAt: new Date().toISOString()
            }
          ],
          photos: [],
          tags: [],
          categories: [],
          sourceName: 'Test Kitchen',
          sourceNotes: null,
          ingredientAdjustments: null
        })
      })
    })

    // Mock the ingredient update endpoint
    await page.route('**/api/recipes/test-recipe-123/ingredients/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ing-1',
            amount: body.amount.toString()
          })
        })
      }
    })

    // Navigate directly to the recipe page
    await page.goto('/protected/recipes/test-recipe-123')

    // Wait for the recipe to load
    await page.waitForSelector('h1:has-text("Test Recipe")')
    await page.waitForSelector('text=Ingredients')

    // Verify we're at 1x scale by default
    const scaleIndicator = page.locator('[role="group"] button[data-state="on"]').filter({ hasText: '1x' })
    await expect(scaleIndicator).toBeVisible()

    // Find the first ingredient with an amount (flour)
    const flourIngredient = page.locator('li').filter({ hasText: '2 cups all-purpose flour' }).first()
    await expect(flourIngredient).toBeVisible()

    // Verify the adjuster button is visible at 1x scale
    const adjusterButton = flourIngredient.locator('button[aria-label*="Adjust amount"]')
    await expect(adjusterButton).toBeVisible()

    // Click the adjuster button
    await adjusterButton.click()

    // Wait for popover to appear
    await page.waitForSelector('h4:has-text("Adjust all-purpose flour")')

    // Find the amount input
    const amountInput = page.locator('input[aria-label="Custom amount"]')
    await expect(amountInput).toBeVisible()
    await expect(amountInput).toHaveValue('2')

    // Find and click the increment button
    const incrementButton = page.locator('button[aria-label="Increase amount"]')
    await incrementButton.click()

    // Verify the amount increased to 2.25
    await expect(amountInput).toHaveValue('2.25')
    await expect(amountInput).toHaveValue('2 ¼')

    // Click outside to close popover
    await page.click('body', { position: { x: 10, y: 10 } })

    // Wait for the update to be reflected
    await page.waitForTimeout(500)

    // Now switch to 2x scale
    const scale2xButton = page.locator('[role="group"] button').filter({ hasText: '2x' })
    await scale2xButton.click()

    // Wait for scale change
    await expect(scale2xButton).toHaveAttribute('data-state', 'on')

    // Verify the adjuster button is NOT visible at 2x scale
    await expect(adjusterButton).not.toBeVisible()

    // Verify the amount is doubled (2.25 * 2 = 4.5)
    const scaledFlour = page.locator('li').filter({ hasText: /4[.½]? cups all-purpose flour/ })
    await expect(scaledFlour).toBeVisible()

    // Switch to 3x scale
    const scale3xButton = page.locator('[role="group"] button').filter({ hasText: '3x' })
    await scale3xButton.click()

    // Wait for scale change
    await expect(scale3xButton).toHaveAttribute('data-state', 'on')

    // Verify the adjuster button is still NOT visible at 3x scale
    await expect(adjusterButton).not.toBeVisible()

    // Verify the amount is tripled (2.25 * 3 = 6.75)
    const tripledFlour = page.locator('li').filter({ hasText: /6[.¾]? cups all-purpose flour/ })
    await expect(tripledFlour).toBeVisible()

    // Go back to 1x scale
    const scale1xButton = page.locator('[role="group"] button').filter({ hasText: '1x' })
    await scale1xButton.click()

    // Verify the adjuster button is visible again
    await expect(adjusterButton).toBeVisible()

    // Verify ingredient without amount (salt) has no adjuster
    const saltIngredient = page.locator('li').filter({ hasText: 'salt' })
    const saltAdjuster = saltIngredient.locator('button[aria-label*="Adjust amount"]')
    await expect(saltAdjuster).not.toBeVisible()
  })

  test('should handle fractional amounts correctly', async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/recipes/test-recipe-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-recipe-123',
          title: 'Test Recipe',
          description: 'Testing fractional amounts',
          servings: 4,
          ingredients: [
            {
              id: 'ing-1',
              ingredient: 'butter',
              amount: '0.5',
              unit: 'cup',
              orderIndex: 0
            }
          ],
          instructions: [],
          photos: [],
          tags: [],
          categories: []
        })
      })
    })

    // Navigate to the recipe
    await page.goto('/protected/recipes/test-recipe-123')

    // Wait for the recipe to load
    await page.waitForSelector('text=Ingredients')

    // Find the butter ingredient (should show as ½ cup)
    const butterIngredient = page.locator('li').filter({ hasText: /½ cup butter/ })
    await expect(butterIngredient).toBeVisible()

    // Click the adjuster
    const adjusterButton = butterIngredient.locator('button[aria-label*="Adjust amount"]')
    await adjusterButton.click()

    // Find the decrement button and click it
    const decrementButton = page.locator('button[aria-label="Decrease amount"]')
    await decrementButton.click()

    // Amount should decrease from 0.5 to 0.375 (⅜)
    const amountInput = page.locator('input[aria-label="Custom amount"]')
    await expect(amountInput).toHaveValue('⅜')

    // Click decrement again
    await decrementButton.click()

    // Amount should decrease to 0.25 (¼)
    await expect(amountInput).toHaveValue('¼')

    // Click decrement once more
    await decrementButton.click()

    // Amount should decrease to 0.125 (⅛)
    await expect(amountInput).toHaveValue('⅛')

    // Try to go lower - it should stay at 0.125
    await decrementButton.click()
    await expect(amountInput).toHaveValue('⅛')
  })
})