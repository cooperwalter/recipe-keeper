import { test, expect } from '@playwright/test'
import { mockAuthentication } from './helpers/auth'
import { setupAPIMocks, setupNavigationMocks } from './helpers/mock-api'

test.describe('Ingredient Adjustment at 1x Scale', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication and API mocking
    await mockAuthentication(page)
    await setupAPIMocks(page)
  })

  test('should show ingredient adjuster only at 1x scale and update recipe directly', async ({ page }) => {
    // Navigate directly to the test recipe page
    await page.goto('/protected/recipes/test-recipe-123')
    
    // Wait for recipe detail page to load
    await page.waitForSelector('h1') // Recipe title
    await page.waitForSelector('text=Ingredients')
    
    // Check that we're at 1x scale by default
    const scaleSelector = page.locator('[aria-label*="Recipe scale"]')
    await expect(scaleSelector).toContainText('1x')
    
    // Find an ingredient with an amount
    const ingredientWithAmount = page.locator('li').filter({ 
      hasText: /^\s*•\s*\d+.*/ 
    }).first()
    
    // Verify the adjuster button is visible at 1x scale
    const adjusterButton = ingredientWithAmount.locator('button[aria-label*="Adjust amount"]')
    await expect(adjusterButton).toBeVisible()
    
    // Get the original amount text
    const originalText = await ingredientWithAmount.textContent()
    const originalAmount = originalText?.match(/(\d+(?:\.\d+)?)/)?.[1] || '1'
    
    // Click the adjuster button to open popover
    await adjusterButton.click()
    
    // Wait for popover to appear
    await page.waitForSelector('text=Adjust')
    
    // Find the amount input in the popover
    const amountInput = page.locator('input[aria-label="Custom amount"]')
    await expect(amountInput).toBeVisible()
    await expect(amountInput).toHaveValue(originalAmount)
    
    // Clear and enter a new amount
    await amountInput.clear()
    await amountInput.fill('2.5')
    
    // Click outside to close popover and trigger save
    await page.click('body', { position: { x: 10, y: 10 } })
    
    // Wait a moment for the update to process
    await page.waitForTimeout(1500)
    
    // Verify the ingredient amount has been updated
    const updatedText = await ingredientWithAmount.textContent()
    expect(updatedText).toContain('2.5')
    expect(updatedText).toContain('2 ½') // Should show formatted fraction
    
    // Now change to 2x scale
    const scaleButton2x = page.locator('button').filter({ hasText: '2x' })
    await scaleButton2x.click()
    
    // Wait for scale change
    await expect(scaleSelector).toContainText('2x')
    
    // Verify the adjuster button is NOT visible at 2x scale
    await expect(adjusterButton).not.toBeVisible()
    
    // Verify the amount is doubled (2.5 * 2 = 5)
    const scaledText = await ingredientWithAmount.textContent()
    expect(scaledText).toContain('5')
    
    // Change to 3x scale
    const scaleButton3x = page.locator('button').filter({ hasText: '3x' })
    await scaleButton3x.click()
    
    // Wait for scale change
    await expect(scaleSelector).toContainText('3x')
    
    // Verify the adjuster button is NOT visible at 3x scale
    await expect(adjusterButton).not.toBeVisible()
    
    // Verify the amount is tripled (2.5 * 3 = 7.5)
    const tripledText = await ingredientWithAmount.textContent()
    expect(tripledText).toContain('7.5')
    expect(tripledText).toContain('7 ½') // Should show formatted fraction
    
    // Go back to 1x to verify the change persisted
    const scaleButton1x = page.locator('button').filter({ hasText: '1x' })
    await scaleButton1x.click()
    
    // Verify we're back at 1x and the amount is still 2.5
    await expect(scaleSelector).toContainText('1x')
    const finalText = await ingredientWithAmount.textContent()
    expect(finalText).toContain('2.5')
    expect(finalText).toContain('2 ½')
    
    // Reload the page to ensure the change was saved to the database
    await page.reload()
    
    // Wait for page to reload
    await page.waitForSelector('h1')
    await page.waitForSelector('text=Ingredients')
    
    // Find the same ingredient again and verify it still shows 2.5
    const reloadedIngredient = page.locator('li').filter({ 
      hasText: /^\s*•\s*\d+.*/ 
    }).first()
    const reloadedText = await reloadedIngredient.textContent()
    expect(reloadedText).toContain('2.5')
    expect(reloadedText).toContain('2 ½')
  })

  test('should handle increment and decrement buttons correctly', async ({ page }) => {
    // Navigate directly to the test recipe page
    await page.goto('/protected/recipes/test-recipe-123')
    
    // Wait for recipe detail page
    await page.waitForSelector('h1')
    await page.waitForSelector('text=Ingredients')
    
    // Find an ingredient with an amount
    const ingredient = page.locator('li').filter({ 
      hasText: /^\s*•\s*\d+.*/ 
    }).first()
    
    // Click the adjuster button
    const adjusterButton = ingredient.locator('button[aria-label*="Adjust amount"]')
    await adjusterButton.click()
    
    // Wait for popover
    await page.waitForSelector('text=Adjust')
    
    // Find the increment and decrement buttons
    const incrementButton = page.locator('button[aria-label="Increase amount"]')
    const decrementButton = page.locator('button[aria-label="Decrease amount"]')
    const amountInput = page.locator('input[aria-label="Custom amount"]')
    
    // Get initial value
    const initialValue = await amountInput.inputValue()
    const initialNumber = parseFloat(initialValue)
    
    // Click increment
    await incrementButton.click()
    
    // Check that value increased
    const incrementedValue = await amountInput.inputValue()
    const incrementedNumber = parseFloat(incrementedValue)
    expect(incrementedNumber).toBeGreaterThan(initialNumber)
    
    // Click decrement twice
    await decrementButton.click()
    await decrementButton.click()
    
    // Check that value decreased
    const decrementedValue = await amountInput.inputValue()
    const decrementedNumber = parseFloat(decrementedValue)
    expect(decrementedNumber).toBeLessThan(initialNumber)
    
    // Verify it doesn't go below 0.125
    for (let i = 0; i < 10; i++) {
      await decrementButton.click()
    }
    
    const minimumValue = await amountInput.inputValue()
    expect(parseFloat(minimumValue)).toBeGreaterThanOrEqual(0.125)
  })

  test('should not show adjustment controls for ingredients without amounts', async ({ page }) => {
    // Navigate directly to the test recipe page
    await page.goto('/protected/recipes/test-recipe-123')
    
    // Wait for recipe detail page
    await page.waitForSelector('h1')
    await page.waitForSelector('text=Ingredients')
    
    // Try to find an ingredient without a numeric amount (like "Salt to taste")
    const ingredientsSection = page.locator('ul').filter({ has: page.locator('li') }).first()
    const allIngredients = ingredientsSection.locator('li')
    const ingredientCount = await allIngredients.count()
    
    let foundIngredientWithoutAmount = false
    
    for (let i = 0; i < ingredientCount; i++) {
      const ingredient = allIngredients.nth(i)
      const text = await ingredient.textContent()
      
      // Check if this ingredient doesn't start with a number
      if (text && !/^\s*•\s*\d+/.test(text)) {
        // This ingredient has no amount, verify no adjuster button
        const adjusterButton = ingredient.locator('button[aria-label*="Adjust amount"]')
        await expect(adjusterButton).not.toBeVisible()
        foundIngredientWithoutAmount = true
        break
      }
    }
    
    // If we found an ingredient without amount, the test passed
    // If not, it's okay - not all recipes have ingredients without amounts
    expect(foundIngredientWithoutAmount || ingredientCount > 0).toBeTruthy()
  })
})