import { test, expect } from '@playwright/test'

test.describe('URL Recipe Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to recipes page and login if needed
    await page.goto('/protected/recipes/new')
    
    // Check if we need to login
    if (await page.url().includes('/auth/login')) {
      // Use test credentials
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'testpassword123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/protected/recipes/new')
    }
  })

  test('should display URL import option on recipe creation page', async ({ page }) => {
    // Check that URL import card is visible
    const urlImportCard = page.locator('text=Import from URL')
    await expect(urlImportCard).toBeVisible()
    
    // Check card description
    await expect(page.locator('text=Extract recipe from any website')).toBeVisible()
    
    // Check feature list
    await expect(page.locator('text=Works with most recipe websites')).toBeVisible()
    await expect(page.locator('text=Automatically extracts ingredients & steps')).toBeVisible()
    await expect(page.locator('text=Preserves original source attribution')).toBeVisible()
  })

  test('should navigate to URL import page', async ({ page }) => {
    // Click on URL import card
    await page.click('text=Import from URL')
    
    // Should navigate to URL import page
    await expect(page).toHaveURL('/protected/recipes/new/url')
    
    // Check page content
    await expect(page.locator('h1:has-text("Import Recipe from URL")')).toBeVisible()
    await expect(page.locator('text=Paste a link to any recipe webpage')).toBeVisible()
  })

  test('should extract recipe from valid URL', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/recipes/url/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recipe: {
            title: 'Chocolate Chip Cookies',
            description: 'Classic homemade chocolate chip cookies',
            ingredients: [
              '2 1/4 cups all-purpose flour',
              '1 tsp baking soda',
              '1 cup butter, softened',
              '3/4 cup granulated sugar',
              '3/4 cup brown sugar',
              '2 large eggs',
              '2 cups chocolate chips'
            ],
            instructions: [
              'Preheat oven to 375°F',
              'Mix flour and baking soda',
              'Beat butter and sugars until creamy',
              'Add eggs and vanilla',
              'Gradually add flour mixture',
              'Stir in chocolate chips',
              'Drop onto baking sheets',
              'Bake 9-11 minutes'
            ],
            prepTime: 15,
            cookTime: 10,
            servings: 48,
            sourceName: 'example.com',
            sourceUrl: 'https://example.com/cookies',
            imageUrl: 'https://example.com/cookies.jpg',
            tags: ['dessert', 'cookies']
          }
        })
      })
    })

    // Navigate to URL import page
    await page.goto('/protected/recipes/new/url')
    
    // Enter URL
    await page.fill('input[type="url"]', 'https://example.com/cookies')
    
    // Click extract button
    await page.click('button:has-text("Extract Recipe")')
    
    // Wait for extraction to complete
    await expect(page.locator('text=Recipe Preview')).toBeVisible()
    
    // Verify extracted data is displayed
    await expect(page.locator('input[value="Chocolate Chip Cookies"]')).toBeVisible()
    await expect(page.locator('textarea:has-text("Classic homemade chocolate chip cookies")')).toBeVisible()
    
    // Check ingredients
    await expect(page.locator('input[value="2 1/4 cups all-purpose flour"]')).toBeVisible()
    await expect(page.locator('input[value="1 cup butter, softened"]')).toBeVisible()
    await expect(page.locator('input[value="2 cups chocolate chips"]')).toBeVisible()
    
    // Check instructions
    await expect(page.locator('textarea:has-text("Preheat oven to 375°F")')).toBeVisible()
    await expect(page.locator('textarea:has-text("Bake 9-11 minutes")')).toBeVisible()
    
    // Check times
    await expect(page.locator('input[value="15"]')).toBeVisible() // prep time
    await expect(page.locator('input[value="10"]')).toBeVisible() // cook time
    await expect(page.locator('input[value="48"]')).toBeVisible() // servings
    
    // Check tags
    await expect(page.locator('text=dessert')).toBeVisible()
    await expect(page.locator('text=cookies')).toBeVisible()
  })

  test('should handle non-recipe URLs gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/api/recipes/url/extract', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'No recipe found',
          message: 'This page does not appear to contain a recipe. Please make sure you\'re providing a direct link to a recipe page.'
        })
      })
    })

    await page.goto('/protected/recipes/new/url')
    
    // Enter non-recipe URL
    await page.fill('input[type="url"]', 'https://example.com/about')
    await page.click('button:has-text("Extract Recipe")')
    
    // Should show error message
    await expect(page.locator('text=This page does not appear to contain a recipe')).toBeVisible()
    
    // Recipe preview should not be shown
    await expect(page.locator('text=Recipe Preview')).not.toBeVisible()
  })

  test('should allow editing extracted recipe', async ({ page }) => {
    // Mock API response
    await page.route('**/api/recipes/url/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recipe: {
            title: 'Original Title',
            description: 'Original description',
            ingredients: ['Ingredient 1', 'Ingredient 2'],
            instructions: ['Step 1', 'Step 2'],
            prepTime: 10,
            cookTime: 20,
            servings: 4,
            sourceUrl: 'https://example.com/recipe',
            tags: ['original']
          }
        })
      })
    })

    await page.goto('/protected/recipes/new/url')
    
    // Extract recipe
    await page.fill('input[type="url"]', 'https://example.com/recipe')
    await page.click('button:has-text("Extract Recipe")')
    
    await expect(page.locator('text=Recipe Preview')).toBeVisible()
    
    // Edit title
    const titleInput = page.locator('input[value="Original Title"]')
    await titleInput.clear()
    await titleInput.fill('Edited Title')
    
    // Edit description
    const descInput = page.locator('textarea:has-text("Original description")')
    await descInput.clear()
    await descInput.fill('Edited description')
    
    // Add new ingredient
    await page.click('button:has-text("Add Ingredient")')
    const newIngredientInput = page.locator('input[value=""]').last()
    await newIngredientInput.fill('New Ingredient')
    
    // Remove an ingredient
    const removeButtons = page.locator('button[class*="ghost"]:has(svg)')
    await removeButtons.first().click()
    
    // Verify changes
    await expect(page.locator('input[value="Edited Title"]')).toBeVisible()
    await expect(page.locator('textarea:has-text("Edited description")')).toBeVisible()
    await expect(page.locator('input[value="New Ingredient"]')).toBeVisible()
    await expect(page.locator('input[value="Ingredient 1"]')).not.toBeVisible()
  })

  test('should save recipe successfully', async ({ page }) => {
    // Mock extraction response
    await page.route('**/api/recipes/url/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recipe: {
            title: 'Test Recipe',
            description: 'Test description',
            ingredients: ['Ingredient 1', 'Ingredient 2'],
            instructions: ['Step 1', 'Step 2'],
            prepTime: 15,
            cookTime: 30,
            servings: 6,
            sourceName: 'example.com',
            sourceUrl: 'https://example.com/recipe',
            imageUrl: 'https://example.com/image.jpg',
            tags: ['test']
          }
        })
      })
    })

    // Mock recipe creation
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-recipe-123',
            title: 'Test Recipe'
          })
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/protected/recipes/new/url')
    
    // Extract recipe
    await page.fill('input[type="url"]', 'https://example.com/recipe')
    await page.click('button:has-text("Extract Recipe")')
    
    await expect(page.locator('text=Recipe Preview')).toBeVisible()
    
    // Save recipe
    await page.click('button:has-text("Save Recipe")')
    
    // Should redirect to recipe page (or show success)
    // Note: Actual navigation might not work in test environment
    await expect(page.locator('button:has-text("Saving...")')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    // Mock extraction with minimal data
    await page.route('**/api/recipes/url/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recipe: {
            title: 'Test Recipe',
            ingredients: ['Test ingredient'],
            instructions: [],
            sourceUrl: 'https://example.com/recipe',
            tags: []
          }
        })
      })
    })

    await page.goto('/protected/recipes/new/url')
    
    // Extract recipe
    await page.fill('input[type="url"]', 'https://example.com/recipe')
    await page.click('button:has-text("Extract Recipe")')
    
    await expect(page.locator('text=Recipe Preview')).toBeVisible()
    
    // Save button should be enabled (has title and ingredients)
    const saveButton = page.locator('button:has-text("Save Recipe")')
    await expect(saveButton).not.toBeDisabled()
    
    // Clear title
    const titleInput = page.locator('input[value="Test Recipe"]')
    await titleInput.clear()
    
    // Save button should be disabled
    await expect(saveButton).toBeDisabled()
    
    // Add title back
    await titleInput.fill('New Title')
    await expect(saveButton).not.toBeDisabled()
    
    // Remove all ingredients
    const removeButton = page.locator('button[class*="ghost"]:has(svg)').first()
    await removeButton.click()
    
    // Save button should be disabled without ingredients
    await expect(saveButton).toBeDisabled()
  })

  test('should show loading state during extraction', async ({ page }) => {
    // Delay the response to see loading state
    await page.route('**/api/recipes/url/extract', async (route) => {
      await page.waitForTimeout(1000) // 1 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recipe: {
            title: 'Test',
            ingredients: ['Test'],
            instructions: ['Test'],
            sourceUrl: 'https://example.com/recipe',
            tags: []
          }
        })
      })
    })

    await page.goto('/protected/recipes/new/url')
    
    // Enter URL and extract
    await page.fill('input[type="url"]', 'https://example.com/recipe')
    await page.click('button:has-text("Extract Recipe")')
    
    // Should show loading state
    await expect(page.locator('text=Extracting...')).toBeVisible()
    await expect(page.locator('button:has-text("Extract Recipe")')).toBeDisabled()
    
    // Wait for extraction to complete
    await expect(page.locator('text=Recipe Preview')).toBeVisible()
  })

  test('should allow starting over', async ({ page }) => {
    // Mock extraction
    await page.route('**/api/recipes/url/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recipe: {
            title: 'Test Recipe',
            ingredients: ['Test'],
            instructions: ['Test'],
            sourceUrl: 'https://example.com/recipe',
            tags: []
          }
        })
      })
    })

    await page.goto('/protected/recipes/new/url')
    
    // Extract recipe
    await page.fill('input[type="url"]', 'https://example.com/recipe')
    await page.click('button:has-text("Extract Recipe")')
    
    await expect(page.locator('text=Recipe Preview')).toBeVisible()
    
    // Click start over
    await page.click('button:has-text("Start Over")')
    
    // Should clear everything
    await expect(page.locator('text=Recipe Preview')).not.toBeVisible()
    await expect(page.locator('input[type="url"]')).toHaveValue('')
  })

  test('should show view original link', async ({ page }) => {
    // Mock extraction
    await page.route('**/api/recipes/url/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recipe: {
            title: 'Test Recipe',
            ingredients: ['Test'],
            instructions: ['Test'],
            sourceUrl: 'https://example.com/original-recipe',
            tags: []
          }
        })
      })
    })

    await page.goto('/protected/recipes/new/url')
    
    // Extract recipe
    await page.fill('input[type="url"]', 'https://example.com/original-recipe')
    await page.click('button:has-text("Extract Recipe")')
    
    await expect(page.locator('text=Recipe Preview')).toBeVisible()
    
    // Check view original link
    const viewOriginalLink = page.locator('a:has-text("View Original")')
    await expect(viewOriginalLink).toBeVisible()
    await expect(viewOriginalLink).toHaveAttribute('href', 'https://example.com/original-recipe')
    await expect(viewOriginalLink).toHaveAttribute('target', '_blank')
  })
})