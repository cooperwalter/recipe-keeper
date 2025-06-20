import { describe, it, expect } from 'vitest'
import { detectRecipeBadges, getBadgeInfo, getBadgeClasses } from '../recipe-badges'
import type { Ingredient } from '@/lib/types/recipe'

describe('detectRecipeBadges', () => {
  const createIngredient = (name: string): Ingredient => ({
    id: '1',
    recipeId: 'recipe1',
    ingredient: name,
    orderIndex: 0,
    createdAt: '2023-01-01'
  })

  describe('Vegan detection', () => {
    it('should detect vegan recipes', () => {
      const ingredients: Ingredient[] = [
        createIngredient('olive oil'),
        createIngredient('garlic'),
        createIngredient('tomatoes'),
        createIngredient('basil'),
        createIngredient('pasta')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).toContain('vegan')
      expect(badges).toContain('vegetarian')
      expect(badges).toContain('dairy-free')
      expect(badges).toContain('egg-free')
    })

    it('should not detect vegan for recipes with dairy', () => {
      const ingredients: Ingredient[] = [
        createIngredient('olive oil'),
        createIngredient('mozzarella cheese'),
        createIngredient('tomatoes')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('vegan')
      expect(badges).toContain('vegetarian')
      expect(badges).not.toContain('dairy-free')
    })

    it('should not detect vegan for recipes with meat', () => {
      const ingredients: Ingredient[] = [
        createIngredient('chicken breast'),
        createIngredient('olive oil'),
        createIngredient('garlic')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('vegan')
      expect(badges).not.toContain('vegetarian')
    })
  })

  describe('Vegetarian detection', () => {
    it('should detect vegetarian recipes with dairy', () => {
      const ingredients: Ingredient[] = [
        createIngredient('eggs'),
        createIngredient('milk'),
        createIngredient('flour'),
        createIngredient('sugar')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('vegan')
      expect(badges).toContain('vegetarian')
    })

    it('should not detect vegetarian for recipes with fish', () => {
      const ingredients: Ingredient[] = [
        createIngredient('salmon fillet'),
        createIngredient('lemon'),
        createIngredient('butter')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('vegetarian')
    })
  })

  describe('Gluten-free detection', () => {
    it('should detect gluten-free recipes', () => {
      const ingredients: Ingredient[] = [
        createIngredient('rice'),
        createIngredient('chicken'),
        createIngredient('vegetables'),
        createIngredient('soy sauce') // This contains gluten!
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('gluten-free')
    })

    it('should detect truly gluten-free recipes', () => {
      const ingredients: Ingredient[] = [
        createIngredient('rice'),
        createIngredient('chicken'),
        createIngredient('vegetables'),
        createIngredient('tamari') // Gluten-free soy sauce alternative
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).toContain('gluten-free')
    })

    it('should not detect gluten-free for recipes with wheat', () => {
      const ingredients: Ingredient[] = [
        createIngredient('all-purpose flour'),
        createIngredient('eggs'),
        createIngredient('milk')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('gluten-free')
    })
  })

  describe('Keto detection', () => {
    it('should detect keto recipes', () => {
      const ingredients: Ingredient[] = [
        createIngredient('avocado'),
        createIngredient('eggs'),
        createIngredient('bacon'),
        createIngredient('cheese'),
        createIngredient('spinach')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).toContain('keto')
      expect(badges).toContain('low-carb')
    })

    it('should not detect keto for high-carb recipes', () => {
      const ingredients: Ingredient[] = [
        createIngredient('pasta'),
        createIngredient('bread'),
        createIngredient('rice')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('keto')
      expect(badges).not.toContain('low-carb')
    })
  })

  describe('Dairy-free detection', () => {
    it('should detect dairy-free recipes', () => {
      const ingredients: Ingredient[] = [
        createIngredient('coconut milk'),
        createIngredient('olive oil'),
        createIngredient('carrots'),
        createIngredient('onions')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).toContain('vegan')
      expect(badges).toContain('dairy-free')
    })

    it('should not detect dairy-free with butter', () => {
      const ingredients: Ingredient[] = [
        createIngredient('butter'),
        createIngredient('flour'),
        createIngredient('sugar')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('dairy-free')
    })
  })

  describe('Nut-free detection', () => {
    it('should detect nut-free recipes', () => {
      const ingredients: Ingredient[] = [
        createIngredient('flour'),
        createIngredient('sugar'),
        createIngredient('eggs')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).toContain('nut-free')
    })

    it('should not detect nut-free with almonds', () => {
      const ingredients: Ingredient[] = [
        createIngredient('almond flour'),
        createIngredient('eggs'),
        createIngredient('sugar')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).not.toContain('nut-free')
    })
  })

  describe('Multiple badges', () => {
    it('should detect multiple badges for complex recipes', () => {
      const ingredients: Ingredient[] = [
        createIngredient('almond flour'),
        createIngredient('eggs'),
        createIngredient('coconut oil'),
        createIngredient('stevia'),
        createIngredient('cocoa powder')
      ]
      
      const badges = detectRecipeBadges(ingredients)
      expect(badges).toContain('vegetarian')
      expect(badges).toContain('gluten-free') // almond flour is gluten-free
      expect(badges).toContain('dairy-free')
      expect(badges).toContain('sugar-free') // uses stevia
      expect(badges).toContain('keto') // low-carb ingredients
      expect(badges).toContain('low-carb')
      expect(badges).not.toContain('vegan') // has eggs
      expect(badges).not.toContain('nut-free') // has almonds
    })
  })
})

describe('getBadgeInfo', () => {
  it('should return correct badge information', () => {
    const veganInfo = getBadgeInfo('vegan')
    expect(veganInfo).toEqual({
      id: 'vegan',
      label: 'Vegan',
      description: 'Contains no animal products',
      color: 'emerald',
      icon: 'leaf'
    })
  })
})

describe('getBadgeClasses', () => {
  it('should return correct Tailwind classes', () => {
    const classes = getBadgeClasses('vegan')
    expect(classes).toContain('bg-emerald-100')
    expect(classes).toContain('text-emerald-800')
  })
})