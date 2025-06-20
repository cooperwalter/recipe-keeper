import { test, expect, Page } from '@playwright/test'

test.describe('Recipe Scaling Feature', () => {
  // Helper to login and navigate to a recipe
  async function navigateToRecipe(page: Page) {
    // Mock a recipe with various ingredient types
    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().url().includes('/api/recipes/test-recipe-123')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-recipe-123',
            title: 'Test Recipe for Scaling',
            description: 'A recipe to test scaling features',
            servings: 4,
            prepTime: 15,
            cookTime: 30,
            ingredients: [
              {
                id: '1',
                ingredient: 'all-purpose flour',
                amount: 2,
                unit: 'cups',
                orderIndex: 0
              },
              {
                id: '2',
                ingredient: 'kosher salt',
                amount: 1,
                unit: 'tsp',
                orderIndex: 1
              },
              {
                id: '3',
                ingredient: 'black pepper',
                amount: 0.5,
                unit: 'tsp',
                orderIndex: 2
              },
              {
                id: '4',
                ingredient: 'baking powder',
                amount: 1,
                unit: 'tbsp',
                orderIndex: 3
              },
              {
                id: '5',
                ingredient: 'eggs',
                amount: 2,
                unit: '',
                orderIndex: 4
              },
              {
                id: '6',
                ingredient: 'milk',
                amount: 1,
                unit: 'cup',
                orderIndex: 5
              },
              {
                id: '7',
                ingredient: 'vanilla extract',
                amount: 1,
                unit: 'tsp',
                orderIndex: 6
              }
            ],
            instructions: [
              {
                id: '1',
                stepNumber: 1,
                instruction: 'Mix dry ingredients'
              },
              {
                id: '2',
                stepNumber: 2,
                instruction: 'Whisk wet ingredients'
              },
              {
                id: '3',
                stepNumber: 3,
                instruction: 'Combine and bake'
              }
            ],
            photos: [],
            tags: ['test'],
            categories: [],
            isFavorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test-user',
            isPublic: false,
            version: 1
          })
        })
      } else {
        await route.continue()
      }
    })

    // Navigate to the recipe
    await page.goto('/protected/recipes/test-recipe-123')
    
    // Check if we need to login
    if (await page.url().includes('/auth/login')) {
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'testpassword123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/protected/recipes/test-recipe-123')
    }
  }

  test('should display recipe scaler with 1x, 2x, 3x options', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Check scaler is visible
    await expect(page.locator('text=Scale recipe:')).toBeVisible()
    
    // Check toggle buttons
    await expect(page.locator('button[role="radio"][aria-label="Original size"]')).toBeVisible()
    await expect(page.locator('button[role="radio"][aria-label="Double recipe"]')).toBeVisible()
    await expect(page.locator('button[role="radio"][aria-label="Triple recipe"]')).toBeVisible()
    
    // Check default servings display
    await expect(page.locator('text=(4 servings)')).toBeVisible()
  })

  test('should scale ingredients linearly by default', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Click 2x scaling
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Check servings updated
    await expect(page.locator('text=(8 servings)')).toBeVisible()
    
    // Check linear scaling ingredients
    await expect(page.locator('text=4 cups all-purpose flour')).toBeVisible() // 2 * 2
    await expect(page.locator('text=2 cups milk')).toBeVisible() // 1 * 2
    await expect(page.locator('text=4 eggs')).toBeVisible() // 2 * 2
  })

  test('should apply smart scaling to spices and seasonings', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Click 2x scaling
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Check smart scaling for seasonings
    // Salt should scale at 80%: 1 * 2 * 0.8 = 1.6 tsp
    await expect(page.locator('text=1.6 tsp kosher salt')).toBeVisible()
    
    // Black pepper should scale at 75%: 0.5 * 2 * 0.75 = 0.75 tsp (displayed as ¾)
    await expect(page.locator('text=¾ tsp black pepper')).toBeVisible()
    
    // Baking powder should scale at 85%: 1 * 2 * 0.85 = 1.7 tbsp
    await expect(page.locator('text=1.7 tbsp baking powder')).toBeVisible()
  })

  test('should show adjustment controls for adjustable ingredients at 2x and 3x', async ({ page }) => {
    await navigateToRecipe(page)
    
    // At 1x, no adjustment controls should be visible
    const adjustButtons = page.locator('button[aria-label*="Adjust amount"]')
    await expect(adjustButtons).toHaveCount(0)
    
    // Click 2x scaling
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Adjustment controls should appear for adjustable ingredients
    await expect(page.locator('button[aria-label="Adjust amount for kosher salt"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Adjust amount for black pepper"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Adjust amount for baking powder"]')).toBeVisible()
    
    // But not for linear ingredients
    await expect(page.locator('button[aria-label="Adjust amount for all-purpose flour"]')).not.toBeVisible()
    await expect(page.locator('button[aria-label="Adjust amount for milk"]')).not.toBeVisible()
  })

  test('should allow custom adjustment of ingredient amounts', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Click 2x scaling
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Click adjustment for salt
    await page.click('button[aria-label="Adjust amount for kosher salt"]')
    
    // Popover should open
    await expect(page.locator('text=Adjust kosher salt')).toBeVisible()
    await expect(page.locator('text=Salt perception increases non-linearly')).toBeVisible()
    
    // Current amount should be 1.6
    const input = page.locator('input[aria-label="Custom amount"]')
    await expect(input).toHaveValue('1.6')
    
    // Click increment button
    await page.click('button[aria-label="Increase amount"]')
    
    // Should increment to 1.85 (1.6 + 0.25)
    await expect(input).toHaveValue('1.85')
    
    // The ingredient display should update
    await expect(page.locator('text=1.85 tsp kosher salt')).toBeVisible()
    
    // The ingredient should be highlighted
    const ingredientSpan = page.locator('span:has-text("1.85 tsp kosher salt")')
    await expect(ingredientSpan).toHaveClass(/text-primary/)
  })

  test('should reset custom adjustments when scale changes', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Scale to 2x
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Adjust salt amount
    await page.click('button[aria-label="Adjust amount for kosher salt"]')
    await page.click('button[aria-label="Increase amount"]')
    
    // Close popover
    await page.keyboard.press('Escape')
    
    // Verify custom amount is shown
    await expect(page.locator('text=1.85 tsp kosher salt')).toBeVisible()
    
    // Change scale to 3x
    await page.click('button[role="radio"][aria-label="Triple recipe"]')
    
    // Custom adjustment should be reset, showing smart scaled amount
    // 1 * 3 * 0.8 = 2.4 tsp
    await expect(page.locator('text=2.4 tsp kosher salt')).toBeVisible()
    await expect(page.locator('text=1.85 tsp kosher salt')).not.toBeVisible()
  })

  test('should handle fraction display correctly', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Click 2x scaling
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Check fraction display for pepper (0.5 * 2 * 0.75 = 0.75)
    await expect(page.locator('text=¾ tsp black pepper')).toBeVisible()
    
    // Click 3x scaling
    await page.click('button[role="radio"][aria-label="Triple recipe"]')
    
    // Check fraction display (0.5 * 3 * 0.75 = 1.125 ≈ 1⅛)
    await expect(page.locator('text=1 ⅛ tsp black pepper')).toBeVisible()
  })

  test('should allow resetting custom adjustments', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Scale to 2x
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Adjust pepper amount
    await page.click('button[aria-label="Adjust amount for black pepper"]')
    
    // Change the amount
    const input = page.locator('input[aria-label="Custom amount"]')
    await input.clear()
    await input.fill('1')
    
    // Verify custom amount
    await expect(page.locator('text=1 tsp black pepper')).toBeVisible()
    
    // Reset button should be visible
    await expect(page.locator('button:has-text("Reset")')).toBeVisible()
    
    // Click reset
    await page.click('button:has-text("Reset")')
    
    // Should revert to smart scaled amount (¾)
    await expect(page.locator('text=¾ tsp black pepper')).toBeVisible()
    
    // Popover should close
    await expect(page.locator('text=Adjust black pepper')).not.toBeVisible()
  })

  test('should show original amount in adjustment popover', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Scale to 3x
    await page.click('button[role="radio"][aria-label="Triple recipe"]')
    
    // Open salt adjustment
    await page.click('button[aria-label="Adjust amount for kosher salt"]')
    
    // Should show original amount
    await expect(page.locator('text=Original: 1 tsp')).toBeVisible()
  })

  test('should handle ingredients without units', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Scale to 2x
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Eggs should scale linearly without unit
    await expect(page.locator('text=4 eggs')).toBeVisible()
  })

  test('should maintain adjustment state while popover is open', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Scale to 2x
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Open pepper adjustment
    await page.click('button[aria-label="Adjust amount for black pepper"]')
    
    // Make multiple adjustments
    await page.click('button[aria-label="Increase amount"]') // 0.75 + 0.125 = 0.875
    await page.click('button[aria-label="Increase amount"]') // 0.875 + 0.125 = 1
    
    // Close and reopen popover
    await page.keyboard.press('Escape')
    await page.click('button[aria-label="Adjust amount for black pepper"]')
    
    // Custom amount should persist
    const input = page.locator('input[aria-label="Custom amount"]')
    await expect(input).toHaveValue('1')
  })

  test('should handle minimum amounts when decrementing', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Scale to 2x
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Open pepper adjustment (starts at 0.75)
    await page.click('button[aria-label="Adjust amount for black pepper"]')
    
    // Decrement multiple times
    await page.click('button[aria-label="Decrease amount"]') // 0.75 - 0.125 = 0.625
    await page.click('button[aria-label="Decrease amount"]') // 0.625 - 0.125 = 0.5
    await page.click('button[aria-label="Decrease amount"]') // 0.5 - 0.125 = 0.375
    await page.click('button[aria-label="Decrease amount"]') // 0.375 - 0.125 = 0.25
    await page.click('button[aria-label="Decrease amount"]') // 0.25 - 0.125 = 0.125 (minimum)
    await page.click('button[aria-label="Decrease amount"]') // Should stay at 0.125
    
    // Should not go below minimum
    const input = page.locator('input[aria-label="Custom amount"]')
    await expect(input).toHaveValue('⅛')
  })

  test('should handle manual input in adjustment popover', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Scale to 2x
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Open salt adjustment
    await page.click('button[aria-label="Adjust amount for kosher salt"]')
    
    // Type custom amount
    const input = page.locator('input[aria-label="Custom amount"]')
    await input.clear()
    await input.fill('2.25')
    
    // Should update display
    await expect(page.locator('text=2.25 tsp kosher salt')).toBeVisible()
    
    // Should handle invalid input gracefully
    await input.clear()
    await input.fill('abc')
    
    // Display should not change from last valid value
    await expect(page.locator('text=2.25 tsp kosher salt')).toBeVisible()
  })

  test('should hide scaling controls when printing', async ({ page }) => {
    await navigateToRecipe(page)
    
    // Scale to 2x to show adjusted amounts
    await page.click('button[role="radio"][aria-label="Double recipe"]')
    
    // Trigger print preview
    await page.emulateMedia({ media: 'print' })
    
    // Scaling controls should be hidden
    await expect(page.locator('text=Scale recipe:')).not.toBeVisible()
    
    // But ingredients should still be visible
    await expect(page.locator('.ingredients-section')).toBeVisible()
  })
})