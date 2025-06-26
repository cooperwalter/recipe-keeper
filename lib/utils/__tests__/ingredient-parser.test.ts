import { describe, it, expect } from 'vitest'
import { parseIngredient, parseIngredients, formatIngredient } from '../ingredient-parser'

describe('parseIngredient', () => {
  it('should parse basic ingredients with amount and unit', () => {
    expect(parseIngredient('1 cup flour')).toEqual({
      amount: '1',
      unit: 'cup',
      ingredient: 'flour'
    })
    
    expect(parseIngredient('2 tablespoons olive oil')).toEqual({
      amount: '2',
      unit: 'tablespoon',
      ingredient: 'olive oil'
    })
  })

  it('should handle fractions', () => {
    expect(parseIngredient('1/2 cup sugar')).toEqual({
      amount: '1/2',
      unit: 'cup',
      ingredient: 'sugar'
    })
    
    expect(parseIngredient('1 1/2 cups milk')).toEqual({
      amount: '1 1/2',
      unit: 'cup',
      ingredient: 'milk'
    })
  })

  it('should handle unicode fractions', () => {
    expect(parseIngredient('½ cup butter')).toEqual({
      amount: '1/2',
      unit: 'cup',
      ingredient: 'butter'
    })
    
    expect(parseIngredient('¾ teaspoon salt')).toEqual({
      amount: '3/4',
      unit: 'teaspoon',
      ingredient: 'salt'
    })
  })

  it('should handle decimal amounts', () => {
    expect(parseIngredient('1.5 pounds chicken')).toEqual({
      amount: '1.5',
      unit: 'pound',
      ingredient: 'chicken'
    })
  })

  it('should handle ranges', () => {
    expect(parseIngredient('2-3 cloves garlic')).toEqual({
      amount: '2-3',
      unit: 'clove',
      ingredient: 'garlic'
    })
    
    expect(parseIngredient('1 to 2 teaspoons vanilla')).toEqual({
      amount: '1 to 2',
      unit: 'teaspoon',
      ingredient: 'vanilla'
    })
  })

  it('should handle ingredients without units', () => {
    expect(parseIngredient('3 eggs')).toEqual({
      amount: '3',
      ingredient: 'eggs'
    })
    
    expect(parseIngredient('1 large onion')).toEqual({
      amount: '1',
      unit: 'large',
      ingredient: 'onion'
    })
  })

  it('should handle ingredients without amounts', () => {
    expect(parseIngredient('salt to taste')).toEqual({
      ingredient: 'salt to taste'
    })
    
    expect(parseIngredient('fresh herbs for garnish')).toEqual({
      ingredient: 'fresh herbs for garnish'
    })
  })

  it('should extract notes in parentheses', () => {
    expect(parseIngredient('1 cup flour (sifted)')).toEqual({
      amount: '1',
      unit: 'cup',
      ingredient: 'flour',
      notes: 'sifted'
    })
    
    expect(parseIngredient('2 tablespoons butter (melted)')).toEqual({
      amount: '2',
      unit: 'tablespoon',
      ingredient: 'butter',
      notes: 'melted'
    })
  })

  it('should handle abbreviations', () => {
    expect(parseIngredient('1 tbsp honey')).toEqual({
      amount: '1',
      unit: 'tablespoon',
      ingredient: 'honey'
    })
    
    expect(parseIngredient('2 tsp cinnamon')).toEqual({
      amount: '2',
      unit: 'teaspoon',
      ingredient: 'cinnamon'
    })
    
    expect(parseIngredient('1 lb ground beef')).toEqual({
      amount: '1',
      unit: 'pound',
      ingredient: 'ground beef'
    })
  })

  it('should handle multi-word units', () => {
    expect(parseIngredient('8 fluid ounces water')).toEqual({
      amount: '8',
      unit: 'fluid ounce',
      ingredient: 'water'
    })
    
    expect(parseIngredient('2 fl oz lemon juice')).toEqual({
      amount: '2',
      unit: 'fluid ounce',
      ingredient: 'lemon juice'
    })
  })

  it('should handle special units', () => {
    expect(parseIngredient('1 dash hot sauce')).toEqual({
      amount: '1',
      unit: 'dash',
      ingredient: 'hot sauce'
    })
    
    expect(parseIngredient('1 pinch salt')).toEqual({
      amount: '1',
      unit: 'pinch',
      ingredient: 'salt'
    })
    
    expect(parseIngredient('1 can tomatoes')).toEqual({
      amount: '1',
      unit: 'can',
      ingredient: 'tomatoes'
    })
  })

  it('should remove leading bullets and numbers', () => {
    expect(parseIngredient('1. 2 cups flour')).toEqual({
      amount: '2',
      unit: 'cup',
      ingredient: 'flour'
    })
    
    expect(parseIngredient('• 1 teaspoon salt')).toEqual({
      amount: '1',
      unit: 'teaspoon',
      ingredient: 'salt'
    })
    
    expect(parseIngredient('- 3 eggs')).toEqual({
      amount: '3',
      ingredient: 'eggs'
    })
  })

  it('should handle edge cases', () => {
    expect(parseIngredient('')).toEqual({
      ingredient: ''
    })
    
    expect(parseIngredient('   ')).toEqual({
      ingredient: ''
    })
    
    expect(parseIngredient(null as unknown as string)).toEqual({
      ingredient: ''
    })
  })
})

describe('parseIngredients', () => {
  it('should parse multiple ingredients', () => {
    const ingredients = [
      '1 cup flour',
      '2 eggs',
      '1/2 teaspoon salt'
    ]
    
    const parsed = parseIngredients(ingredients)
    
    expect(parsed).toEqual([
      { amount: '1', unit: 'cup', ingredient: 'flour' },
      { amount: '2', ingredient: 'eggs' },
      { amount: '1/2', unit: 'teaspoon', ingredient: 'salt' }
    ])
  })
})

describe('formatIngredient', () => {
  it('should format parsed ingredient back to string', () => {
    expect(formatIngredient({
      amount: '1',
      unit: 'cup',
      ingredient: 'flour'
    })).toBe('1 cup flour')
    
    expect(formatIngredient({
      amount: '2',
      unit: 'tablespoon',
      ingredient: 'butter',
      notes: 'melted'
    })).toBe('2 tablespoon butter (melted)')
    
    expect(formatIngredient({
      ingredient: 'salt to taste'
    })).toBe('salt to taste')
  })
})