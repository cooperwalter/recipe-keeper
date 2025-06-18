import { describe, it, expect } from 'vitest'
import { 
  formatAmount, 
  scaleIngredient, 
  formatScaledIngredient,
  scaleIngredientWithRules,
  getDisplayAmount
} from '../recipe-scaling'
import type { Ingredient } from '@/lib/types/recipe'

describe('formatAmount', () => {
  it('should format whole numbers correctly', () => {
    expect(formatAmount(1)).toBe('1')
    expect(formatAmount(5)).toBe('5')
    expect(formatAmount(10)).toBe('10')
  })

  it('should format common fractions with unicode symbols', () => {
    expect(formatAmount(0.5)).toBe('½')
    expect(formatAmount(0.25)).toBe('¼')
    expect(formatAmount(0.75)).toBe('¾')
    expect(formatAmount(0.333)).toBe('⅓')
    expect(formatAmount(0.666)).toBe('⅔')
    expect(formatAmount(0.125)).toBe('⅛')
    expect(formatAmount(0.375)).toBe('⅜')
    expect(formatAmount(0.625)).toBe('⅝')
    expect(formatAmount(0.875)).toBe('⅞')
  })

  it('should format mixed numbers correctly', () => {
    expect(formatAmount(1.5)).toBe('1 ½')
    expect(formatAmount(2.25)).toBe('2 ¼')
    expect(formatAmount(3.75)).toBe('3 ¾')
    expect(formatAmount(1.333)).toBe('1 ⅓')
  })

  it('should round other decimals to 2 places and remove trailing zeros', () => {
    expect(formatAmount(1.4)).toBe('1.4')
    expect(formatAmount(2.67)).toBe('2.67')
    expect(formatAmount(3.10)).toBe('3.1')
    expect(formatAmount(4.00)).toBe('4')
  })
})

describe('scaleIngredient', () => {
  const baseIngredient: Ingredient = {
    id: '1',
    recipeId: 'recipe1',
    ingredient: 'flour',
    amount: 2,
    unit: 'cups',
    orderIndex: 0,
    createdAt: '2023-01-01'
  }

  it('should scale ingredient amounts correctly', () => {
    const scaled2x = scaleIngredient(baseIngredient, 2)
    expect(scaled2x.amount).toBe(4)

    const scaled3x = scaleIngredient(baseIngredient, 3)
    expect(scaled3x.amount).toBe(6)

    const scaledHalf = scaleIngredient(baseIngredient, 0.5)
    expect(scaledHalf.amount).toBe(1)
  })

  it('should handle ingredients without amounts', () => {
    const ingredientNoAmount: Ingredient = {
      ...baseIngredient,
      amount: undefined
    }
    const scaled = scaleIngredient(ingredientNoAmount, 2)
    expect(scaled.amount).toBeUndefined()
  })

  it('should preserve all other ingredient properties', () => {
    const scaled = scaleIngredient(baseIngredient, 2)
    expect(scaled.id).toBe(baseIngredient.id)
    expect(scaled.recipeId).toBe(baseIngredient.recipeId)
    expect(scaled.ingredient).toBe(baseIngredient.ingredient)
    expect(scaled.unit).toBe(baseIngredient.unit)
    expect(scaled.orderIndex).toBe(baseIngredient.orderIndex)
  })
})

describe('formatScaledIngredient', () => {
  it('should format complete ingredients correctly', () => {
    const ingredient: Ingredient = {
      id: '1',
      recipeId: 'recipe1',
      ingredient: 'all-purpose flour',
      amount: 1,
      unit: 'cup',
      orderIndex: 0,
      notes: 'sifted',
      createdAt: '2023-01-01'
    }

    expect(formatScaledIngredient(ingredient, 1)).toBe('1 cup all-purpose flour (sifted)')
    expect(formatScaledIngredient(ingredient, 2)).toBe('2 cup all-purpose flour (sifted)')
    expect(formatScaledIngredient(ingredient, 0.5)).toBe('½ cup all-purpose flour (sifted)')
  })

  it('should handle ingredients without units', () => {
    const ingredient: Ingredient = {
      id: '1',
      recipeId: 'recipe1',
      ingredient: 'eggs',
      amount: 2,
      orderIndex: 0,
      createdAt: '2023-01-01'
    }

    expect(formatScaledIngredient(ingredient, 1)).toBe('2 eggs')
    expect(formatScaledIngredient(ingredient, 2)).toBe('4 eggs')
  })

  it('should handle ingredients without amounts', () => {
    const ingredient: Ingredient = {
      id: '1',
      recipeId: 'recipe1',
      ingredient: 'salt to taste',
      orderIndex: 0,
      createdAt: '2023-01-01'
    }

    expect(formatScaledIngredient(ingredient, 2)).toBe('salt to taste')
  })

  it('should format fractional amounts with scaling', () => {
    const ingredient: Ingredient = {
      id: '1',
      recipeId: 'recipe1',
      ingredient: 'butter',
      amount: 0.25,
      unit: 'cup',
      orderIndex: 0,
      createdAt: '2023-01-01'
    }

    expect(formatScaledIngredient(ingredient, 1)).toBe('¼ cup butter')
    expect(formatScaledIngredient(ingredient, 2)).toBe('½ cup butter')
    expect(formatScaledIngredient(ingredient, 3)).toBe('¾ cup butter')
  })
})

describe('scaleIngredientWithRules', () => {
  const baseIngredient: Ingredient = {
    id: '1',
    recipeId: 'recipe1',
    ingredient: 'black pepper',
    amount: 1,
    unit: 'tsp',
    orderIndex: 0,
    createdAt: '2023-01-01'
  }

  it('should identify adjustable ingredients', () => {
    const scaled = scaleIngredientWithRules(baseIngredient, 2)
    expect(scaled.isAdjustable).toBe(true)
    expect(scaled.adjustmentReason).toBeTruthy()
  })

  it('should apply smart scaling rules for spices', () => {
    const scaled = scaleIngredientWithRules(baseIngredient, 2)
    expect(scaled.scaledAmount).toBe(1.5) // 1 * 2 * 0.75
    expect(scaled.hasCustomAdjustment).toBe(false)
  })

  it('should use custom adjustments when provided', () => {
    const customAdjustments = { '1': 1.25 }
    const scaled = scaleIngredientWithRules(baseIngredient, 2, customAdjustments)
    expect(scaled.customAmount).toBe(1.25)
    expect(scaled.hasCustomAdjustment).toBe(true)
  })

  it('should handle ingredients without amounts', () => {
    const noAmountIngredient: Ingredient = {
      ...baseIngredient,
      amount: undefined
    }
    const scaled = scaleIngredientWithRules(noAmountIngredient, 2)
    expect(scaled.isAdjustable).toBe(false) // Ingredients without amounts are not adjustable
    expect(scaled.scaledAmount).toBeUndefined()
  })

  it('should scale flour linearly', () => {
    const flourIngredient: Ingredient = {
      ...baseIngredient,
      ingredient: 'all-purpose flour',
      amount: 2,
      unit: 'cups'
    }
    const scaled = scaleIngredientWithRules(flourIngredient, 2)
    expect(scaled.scaledAmount).toBe(4) // Linear scaling
    expect(scaled.isAdjustable).toBe(true) // Now all ingredients are adjustable
  })

  it('should handle salt with special scaling', () => {
    const saltIngredient: Ingredient = {
      ...baseIngredient,
      ingredient: 'kosher salt',
      amount: 1
    }
    const scaled = scaleIngredientWithRules(saltIngredient, 3)
    expect(scaled.scaledAmount).toBe(2.4) // 1 * 3 * 0.8
    expect(scaled.isAdjustable).toBe(true)
  })

  it('should preserve original amount', () => {
    const scaled = scaleIngredientWithRules(baseIngredient, 2)
    expect(scaled.amount).toBe(1) // Original amount preserved
  })
})

describe('getDisplayAmount', () => {
  it('should prioritize custom amount', () => {
    const ingredient = {
      ...({} as Ingredient),
      amount: 1,
      scaledAmount: 2,
      customAmount: 1.5,
      isAdjustable: true,
      hasCustomAdjustment: true
    }
    expect(getDisplayAmount(ingredient)).toBe(1.5)
  })

  it('should use scaled amount when no custom amount', () => {
    const ingredient = {
      ...({} as Ingredient),
      amount: 1,
      scaledAmount: 2,
      isAdjustable: true,
      hasCustomAdjustment: false
    }
    expect(getDisplayAmount(ingredient)).toBe(2)
  })

  it('should fall back to original amount', () => {
    const ingredient = {
      ...({} as Ingredient),
      amount: 1,
      isAdjustable: false,
      hasCustomAdjustment: false
    }
    expect(getDisplayAmount(ingredient)).toBe(1)
  })

  it('should handle missing amounts', () => {
    const ingredient = {
      ...({} as Ingredient),
      isAdjustable: false,
      hasCustomAdjustment: false
    }
    expect(getDisplayAmount(ingredient)).toBe(0)
  })
})