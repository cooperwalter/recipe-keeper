import { describe, it, expect } from 'vitest'
import {
  detectIngredientCategory,
  getScalingRule,
  isAdjustableIngredient,
  calculateSmartScaledAmount
} from '../ingredient-scaling-rules'

describe('detectIngredientCategory', () => {
  it('should detect spices correctly', () => {
    expect(detectIngredientCategory('black pepper')).toBe('spice')
    expect(detectIngredientCategory('ground cumin')).toBe('spice')
    expect(detectIngredientCategory('paprika powder')).toBe('spice')
    expect(detectIngredientCategory('cayenne')).toBe('spice')
    expect(detectIngredientCategory('curry powder')).toBe('spice')
  })

  it('should detect herbs correctly', () => {
    expect(detectIngredientCategory('fresh basil')).toBe('herb')
    expect(detectIngredientCategory('dried oregano')).toBe('herb')
    expect(detectIngredientCategory('thyme leaves')).toBe('herb')
    expect(detectIngredientCategory('chopped parsley')).toBe('herb')
  })

  it('should detect salt correctly', () => {
    expect(detectIngredientCategory('salt')).toBe('salt')
    expect(detectIngredientCategory('kosher salt')).toBe('salt')
    expect(detectIngredientCategory('sea salt')).toBe('salt')
    expect(detectIngredientCategory('table salt')).toBe('salt')
  })

  it('should detect sugar correctly', () => {
    expect(detectIngredientCategory('sugar')).toBe('sugar')
    expect(detectIngredientCategory('brown sugar')).toBe('sugar')
    expect(detectIngredientCategory('powdered sugar')).toBe('sugar')
    expect(detectIngredientCategory('honey')).toBe('sugar')
    expect(detectIngredientCategory('maple syrup')).toBe('sugar')
  })

  it('should detect leavening agents correctly', () => {
    expect(detectIngredientCategory('baking soda')).toBe('leavening')
    expect(detectIngredientCategory('baking powder')).toBe('leavening')
    expect(detectIngredientCategory('active dry yeast')).toBe('leavening')
    expect(detectIngredientCategory('instant yeast')).toBe('leavening')
  })

  it('should detect fats correctly', () => {
    expect(detectIngredientCategory('butter')).toBe('fat')
    expect(detectIngredientCategory('olive oil')).toBe('fat')
    expect(detectIngredientCategory('vegetable oil')).toBe('fat')
    expect(detectIngredientCategory('melted butter')).toBe('fat')
  })

  it('should detect liquids correctly', () => {
    expect(detectIngredientCategory('water')).toBe('liquid')
    expect(detectIngredientCategory('whole milk')).toBe('liquid')
    expect(detectIngredientCategory('chicken broth')).toBe('liquid')
    expect(detectIngredientCategory('red wine')).toBe('liquid')
  })

  it('should detect flour correctly', () => {
    expect(detectIngredientCategory('all-purpose flour')).toBe('flour')
    expect(detectIngredientCategory('bread flour')).toBe('flour')
    expect(detectIngredientCategory('whole wheat flour')).toBe('flour')
    expect(detectIngredientCategory('almond flour')).toBe('flour')
  })

  it('should detect eggs correctly', () => {
    expect(detectIngredientCategory('eggs')).toBe('egg')
    expect(detectIngredientCategory('large eggs')).toBe('egg')
    expect(detectIngredientCategory('egg whites')).toBe('egg')
    expect(detectIngredientCategory('beaten egg')).toBe('egg')
  })

  it('should detect vegetables correctly', () => {
    expect(detectIngredientCategory('diced onion')).toBe('vegetable')
    expect(detectIngredientCategory('minced garlic')).toBe('vegetable')
    expect(detectIngredientCategory('carrots')).toBe('vegetable')
    expect(detectIngredientCategory('bell pepper')).toBe('vegetable')
  })

  it('should detect meat correctly', () => {
    expect(detectIngredientCategory('chicken breast')).toBe('meat')
    expect(detectIngredientCategory('ground beef')).toBe('meat')
    expect(detectIngredientCategory('pork chops')).toBe('meat')
    expect(detectIngredientCategory('salmon fillet')).toBe('meat')
  })

  it('should return other for unknown ingredients', () => {
    expect(detectIngredientCategory('vanilla extract')).toBe('other')
    expect(detectIngredientCategory('cornstarch')).toBe('other')
    expect(detectIngredientCategory('gelatin')).toBe('other')
  })
})

describe('getScalingRule', () => {
  it('should return correct scaling rules for spices', () => {
    const rule = getScalingRule('black pepper')
    expect(rule.category).toBe('spice')
    expect(rule.scalingFactor).toBe(0.75)
    expect(rule.minAmount).toBe(0.125)
    expect(rule.reason).toBeTruthy()
  })

  it('should return correct scaling rules for salt', () => {
    const rule = getScalingRule('kosher salt')
    expect(rule.category).toBe('salt')
    expect(rule.scalingFactor).toBe(0.8)
    expect(rule.minAmount).toBe(0.25)
  })

  it('should return correct scaling rules for leavening', () => {
    const rule = getScalingRule('baking powder')
    expect(rule.category).toBe('leavening')
    expect(rule.scalingFactor).toBe(0.85)
    expect(rule.threshold).toBe(2)
  })

  it('should return linear scaling for liquids', () => {
    const rule = getScalingRule('milk')
    expect(rule.category).toBe('liquid')
    expect(rule.scalingFactor).toBe(1.0)
  })
})

describe('isAdjustableIngredient', () => {
  it('should return true for all ingredients', () => {
    // All ingredients are now adjustable
    expect(isAdjustableIngredient('black pepper')).toBe(true)
    expect(isAdjustableIngredient('salt')).toBe(true)
    expect(isAdjustableIngredient('baking soda')).toBe(true)
    expect(isAdjustableIngredient('dried oregano')).toBe(true)
    expect(isAdjustableIngredient('sugar')).toBe(true)
    expect(isAdjustableIngredient('water')).toBe(true)
    expect(isAdjustableIngredient('flour')).toBe(true)
    expect(isAdjustableIngredient('carrots')).toBe(true)
    expect(isAdjustableIngredient('chicken')).toBe(true)
    expect(isAdjustableIngredient('vanilla extract')).toBe(true)
  })
})

describe('calculateSmartScaledAmount', () => {
  it('should scale spices conservatively', () => {
    // 1 tsp pepper scaled 2x should be 1.5 tsp, not 2 tsp
    expect(calculateSmartScaledAmount(1, 2, 'black pepper')).toBe(1.5)
    // 0.5 tsp pepper scaled 3x should be 1.125 tsp
    expect(calculateSmartScaledAmount(0.5, 3, 'ground pepper')).toBe(1.13)
  })

  it('should respect minimum amounts', () => {
    // Even tiny amounts shouldn't go below minimum
    // 0.1 * 0.5 * 0.75 = 0.0375, but minimum is 0.125, which rounds to 0.13
    expect(calculateSmartScaledAmount(0.1, 0.5, 'black pepper')).toBe(0.13)
    expect(calculateSmartScaledAmount(0.2, 0.5, 'salt')).toBe(0.25)
  })

  it('should handle leavening with threshold', () => {
    // 1 tsp baking powder scaled 2x
    expect(calculateSmartScaledAmount(1, 2, 'baking powder')).toBe(1.7)
    // 1 tsp baking powder scaled 3x (past threshold)
    // = 1 * 2 * 0.85 + (1 * 1 * 0.85 * 0.5) = 1.7 + 0.425 = 2.125
    expect(calculateSmartScaledAmount(1, 3, 'baking powder')).toBe(2.13)
  })

  it('should scale liquids linearly', () => {
    expect(calculateSmartScaledAmount(1, 2, 'water')).toBe(2)
    expect(calculateSmartScaledAmount(0.5, 3, 'milk')).toBe(1.5)
    expect(calculateSmartScaledAmount(2, 0.5, 'broth')).toBe(1)
  })

  it('should scale flour linearly', () => {
    expect(calculateSmartScaledAmount(2, 2, 'all-purpose flour')).toBe(4)
    expect(calculateSmartScaledAmount(1.5, 3, 'bread flour')).toBe(4.5)
  })

  it('should handle salt scaling', () => {
    // 1 tsp salt scaled 2x should be 1.6 tsp
    expect(calculateSmartScaledAmount(1, 2, 'salt')).toBe(1.6)
    // 0.5 tsp salt scaled 3x should be 1.2 tsp
    expect(calculateSmartScaledAmount(0.5, 3, 'kosher salt')).toBe(1.2)
  })

  it('should handle sugar scaling', () => {
    // Sugar scales at 0.95
    expect(calculateSmartScaledAmount(1, 2, 'sugar')).toBe(1.9)
    expect(calculateSmartScaledAmount(0.5, 3, 'brown sugar')).toBe(1.42)
  })

  it('should handle fat scaling', () => {
    // Fat scales at 0.9
    expect(calculateSmartScaledAmount(1, 2, 'butter')).toBe(1.8)
    expect(calculateSmartScaledAmount(0.25, 4, 'olive oil')).toBe(0.9)
  })

  it('should maintain egg minimums', () => {
    // Can't have less than 1 egg
    expect(calculateSmartScaledAmount(2, 0.5, 'eggs')).toBe(1)
    expect(calculateSmartScaledAmount(1, 0.25, 'egg')).toBe(1)
    // But can scale up normally
    expect(calculateSmartScaledAmount(2, 2, 'eggs')).toBe(4)
  })

  it('should round to reasonable precision', () => {
    // Should round to 2 decimal places
    expect(calculateSmartScaledAmount(0.333, 2, 'pepper')).toBe(0.5)
    expect(calculateSmartScaledAmount(0.777, 2, 'salt')).toBe(1.24)
  })
})