import { describe, it, expect } from 'vitest'
import {
  calculateRecipeSimilarity,
  findSimilarRecipes,
  checkForDuplicates,
  getSimilarityDescription,
  getRecipeDifferences
} from '../recipe-similarity'
import type { RecipeWithRelations, Ingredient } from '@/lib/types/recipe'

// Helper to create a test recipe
function createTestRecipe(overrides: Partial<RecipeWithRelations> = {}): RecipeWithRelations {
  return {
    id: 'test-1',
    title: 'Chocolate Chip Cookies',
    description: 'Classic chocolate chip cookies',
    prepTime: 15,
    cookTime: 12,
    servings: 24,
    ingredients: [
      { id: '1', recipeId: 'test-1', ingredient: 'butter', amount: 1, unit: 'cup', orderIndex: 0, createdAt: '2024-01-01' },
      { id: '2', recipeId: 'test-1', ingredient: 'sugar', amount: 0.75, unit: 'cup', orderIndex: 1, createdAt: '2024-01-01' },
      { id: '3', recipeId: 'test-1', ingredient: 'brown sugar', amount: 0.75, unit: 'cup', orderIndex: 2, createdAt: '2024-01-01' },
      { id: '4', recipeId: 'test-1', ingredient: 'eggs', amount: 2, unit: '', orderIndex: 3, createdAt: '2024-01-01' },
      { id: '5', recipeId: 'test-1', ingredient: 'vanilla extract', amount: 2, unit: 'tsp', orderIndex: 4, createdAt: '2024-01-01' },
      { id: '6', recipeId: 'test-1', ingredient: 'flour', amount: 2.25, unit: 'cups', orderIndex: 5, createdAt: '2024-01-01' },
      { id: '7', recipeId: 'test-1', ingredient: 'baking soda', amount: 1, unit: 'tsp', orderIndex: 6, createdAt: '2024-01-01' },
      { id: '8', recipeId: 'test-1', ingredient: 'salt', amount: 1, unit: 'tsp', orderIndex: 7, createdAt: '2024-01-01' },
      { id: '9', recipeId: 'test-1', ingredient: 'chocolate chips', amount: 2, unit: 'cups', orderIndex: 8, createdAt: '2024-01-01' },
    ] as Ingredient[],
    instructions: [
      { id: '1', recipeId: 'test-1', stepNumber: 1, instruction: 'Preheat oven to 375°F', createdAt: '2024-01-01' },
      { id: '2', recipeId: 'test-1', stepNumber: 2, instruction: 'Cream butter and sugars', createdAt: '2024-01-01' },
      { id: '3', recipeId: 'test-1', stepNumber: 3, instruction: 'Add eggs and vanilla', createdAt: '2024-01-01' },
      { id: '4', recipeId: 'test-1', stepNumber: 4, instruction: 'Mix in dry ingredients', createdAt: '2024-01-01' },
      { id: '5', recipeId: 'test-1', stepNumber: 5, instruction: 'Fold in chocolate chips', createdAt: '2024-01-01' },
      { id: '6', recipeId: 'test-1', stepNumber: 6, instruction: 'Drop by spoonfuls and bake 10-12 minutes', createdAt: '2024-01-01' },
    ],
    tags: ['dessert', 'cookies'],
    categories: [],
    photos: [],
    createdBy: 'user-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isPublic: false,
    isFavorite: false,
    version: 1,
    ...overrides
  }
}

describe('Recipe Similarity Algorithm', () => {
  describe('calculateRecipeSimilarity', () => {
    it('should return 1.0 for identical recipes', () => {
      const recipe1 = createTestRecipe()
      const recipe2 = createTestRecipe({ id: 'test-2' })
      
      const score = calculateRecipeSimilarity(recipe1, recipe2)
      
      expect(score.overall).toBeCloseTo(1.0, 1)
      expect(score.titleSimilarity).toBe(1.0)
      expect(score.ingredientSimilarity).toBe(1.0)
      expect(score.instructionSimilarity).toBe(1.0)
      expect(score.servingsSimilarity).toBe(1.0)
      expect(score.timeSimilarity).toBe(1.0)
    })

    it('should detect high similarity for minor variations', () => {
      const recipe1 = createTestRecipe()
      const recipe2 = createTestRecipe({
        id: 'test-2',
        title: 'Chocolate Chip Cookies Recipe', // Slightly different title
        servings: 30, // Different servings
      })
      
      const score = calculateRecipeSimilarity(recipe1, recipe2)
      
      expect(score.overall).toBeGreaterThan(0.85) // Should be duplicate
      expect(score.titleSimilarity).toBeGreaterThan(0.7)
      expect(score.ingredientSimilarity).toBe(1.0)
    })

    it('should detect similar recipes with ingredient variations', () => {
      const recipe1 = createTestRecipe()
      const recipe2 = createTestRecipe({
        id: 'test-2',
        ingredients: [
          { id: '1', recipeId: 'test-2', ingredient: 'butter', amount: 1, unit: 'cup', orderIndex: 0, createdAt: '2024-01-01' },
          { id: '2', recipeId: 'test-2', ingredient: 'white sugar', amount: 0.75, unit: 'cup', orderIndex: 1, createdAt: '2024-01-01' }, // 'white sugar' vs 'sugar'
          { id: '3', recipeId: 'test-2', ingredient: 'brown sugar', amount: 0.75, unit: 'cup', orderIndex: 2, createdAt: '2024-01-01' },
          { id: '4', recipeId: 'test-2', ingredient: 'eggs', amount: 2, unit: '', orderIndex: 3, createdAt: '2024-01-01' },
          { id: '5', recipeId: 'test-2', ingredient: 'vanilla', amount: 2, unit: 'tsp', orderIndex: 4, createdAt: '2024-01-01' }, // 'vanilla' vs 'vanilla extract'
          { id: '6', recipeId: 'test-2', ingredient: 'all-purpose flour', amount: 2.25, unit: 'cups', orderIndex: 5, createdAt: '2024-01-01' }, // 'all-purpose flour' vs 'flour'
          { id: '7', recipeId: 'test-2', ingredient: 'baking soda', amount: 1, unit: 'tsp', orderIndex: 6, createdAt: '2024-01-01' },
          { id: '8', recipeId: 'test-2', ingredient: 'salt', amount: 1, unit: 'tsp', orderIndex: 7, createdAt: '2024-01-01' },
          { id: '9', recipeId: 'test-2', ingredient: 'chocolate chips', amount: 2, unit: 'cups', orderIndex: 8, createdAt: '2024-01-01' },
          { id: '10', recipeId: 'test-2', ingredient: 'walnuts', amount: 1, unit: 'cup', orderIndex: 9, createdAt: '2024-01-01' }, // Extra ingredient
        ] as Ingredient[]
      })
      
      const score = calculateRecipeSimilarity(recipe1, recipe2)
      
      expect(score.overall).toBeGreaterThan(0.4) // Should be somewhat similar
      expect(score.overall).toBeLessThan(0.85) // But not duplicate
      expect(score.ingredientSimilarity).toBeGreaterThan(0.4) // Many ingredients match
      expect(score.ingredientSimilarity).toBeLessThan(0.9)
    })

    it('should detect different recipes', () => {
      const recipe1 = createTestRecipe()
      const recipe2 = createTestRecipe({
        id: 'test-2',
        title: 'Spaghetti Carbonara',
        ingredients: [
          { id: '1', recipeId: 'test-2', ingredient: 'spaghetti', amount: 1, unit: 'lb', orderIndex: 0, createdAt: '2024-01-01' },
          { id: '2', recipeId: 'test-2', ingredient: 'eggs', amount: 4, unit: '', orderIndex: 1, createdAt: '2024-01-01' },
          { id: '3', recipeId: 'test-2', ingredient: 'bacon', amount: 8, unit: 'slices', orderIndex: 2, createdAt: '2024-01-01' },
          { id: '4', recipeId: 'test-2', ingredient: 'parmesan cheese', amount: 1, unit: 'cup', orderIndex: 3, createdAt: '2024-01-01' },
          { id: '5', recipeId: 'test-2', ingredient: 'black pepper', amount: 1, unit: 'tsp', orderIndex: 4, createdAt: '2024-01-01' },
        ] as Ingredient[],
        instructions: [
          { id: '1', recipeId: 'test-2', stepNumber: 1, instruction: 'Cook pasta', createdAt: '2024-01-01' },
          { id: '2', recipeId: 'test-2', stepNumber: 2, instruction: 'Cook bacon', createdAt: '2024-01-01' },
          { id: '3', recipeId: 'test-2', stepNumber: 3, instruction: 'Mix eggs and cheese', createdAt: '2024-01-01' },
          { id: '4', recipeId: 'test-2', stepNumber: 4, instruction: 'Combine all ingredients', createdAt: '2024-01-01' },
        ],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
      })
      
      const score = calculateRecipeSimilarity(recipe1, recipe2)
      
      expect(score.overall).toBeLessThan(0.3) // Very different
      expect(score.titleSimilarity).toBeCloseTo(0.18, 1) // Some letter overlap
      expect(score.ingredientSimilarity).toBeLessThan(0.2) // Only eggs in common
    })

    it('should handle recipes with missing data gracefully', () => {
      const recipe1 = createTestRecipe({
        ingredients: [],
        instructions: [],
        prepTime: undefined,
        cookTime: undefined,
        servings: undefined
      })
      const recipe2 = createTestRecipe({ id: 'test-2' })
      
      const score = calculateRecipeSimilarity(recipe1, recipe2)
      
      expect(score.overall).toBeGreaterThan(0) // Title similarity still counts
      expect(score.ingredientSimilarity).toBe(0)
      expect(score.instructionSimilarity).toBe(0)
      expect(score.timeSimilarity).toBe(0.5) // Default for missing data
    })

    it('should correctly handle empty ingredients lists', () => {
      const recipe1 = createTestRecipe({ ingredients: [] })
      const recipe2 = createTestRecipe({ id: 'test-2', ingredients: [] })
      
      const score = calculateRecipeSimilarity(recipe1, recipe2)
      
      expect(score.ingredientSimilarity).toBe(1) // Both empty = identical
    })

    it('should correctly handle empty instruction lists', () => {
      const recipe1 = createTestRecipe({ instructions: [] })
      const recipe2 = createTestRecipe({ id: 'test-2', instructions: [] })
      
      const score = calculateRecipeSimilarity(recipe1, recipe2)
      
      expect(score.instructionSimilarity).toBe(1) // Both empty = identical
    })

    it('should handle ingredients with empty names', () => {
      const recipe1 = createTestRecipe({
        ingredients: [
          { id: '1', recipeId: 'test-1', ingredient: '', amount: 1, unit: 'cup', orderIndex: 0, createdAt: '2024-01-01' },
          { id: '2', recipeId: 'test-1', ingredient: 'sugar', amount: 1, unit: 'cup', orderIndex: 1, createdAt: '2024-01-01' },
        ] as Ingredient[]
      })
      const recipe2 = createTestRecipe({
        id: 'test-2',
        ingredients: [
          { id: '1', recipeId: 'test-2', ingredient: 'sugar', amount: 1, unit: 'cup', orderIndex: 0, createdAt: '2024-01-01' },
        ] as Ingredient[]
      })
      
      const score = calculateRecipeSimilarity(recipe1, recipe2)
      
      // Should handle empty ingredient names gracefully
      expect(score.ingredientSimilarity).toBe(1) // Only 'sugar' counts, and it matches
    })
  })

  describe('findSimilarRecipes', () => {
    it('should find similar recipes above threshold', () => {
      const target = createTestRecipe()
      const recipes = [
        createTestRecipe({ id: 'similar-1', title: 'Choc Chip Cookies' }),
        createTestRecipe({ id: 'similar-2', title: 'Chocolate Chip Cookie Recipe' }),
        createTestRecipe({ 
          id: 'different', 
          title: 'Pancakes',
          ingredients: [
            { id: '1', recipeId: 'different', ingredient: 'flour', amount: 2, unit: 'cups', orderIndex: 0, createdAt: '2024-01-01' },
            { id: '2', recipeId: 'different', ingredient: 'milk', amount: 1.5, unit: 'cups', orderIndex: 1, createdAt: '2024-01-01' },
            { id: '3', recipeId: 'different', ingredient: 'eggs', amount: 2, unit: '', orderIndex: 2, createdAt: '2024-01-01' },
          ] as Ingredient[]
        }),
      ]
      
      const matches = findSimilarRecipes(target, recipes)
      
      expect(matches).toHaveLength(2) // Only the similar cookies
      // Both should be duplicates with high similarity
      expect(matches.some(m => m.recipe.id === 'similar-1')).toBe(true)
      expect(matches.some(m => m.recipe.id === 'similar-2')).toBe(true)
      expect(matches.every(m => m.isDuplicate)).toBe(true)
    })

    it('should respect minScore option', () => {
      const target = createTestRecipe()
      const recipes = [
        createTestRecipe({ id: 'very-similar', title: 'Chocolate Chip Cookies' }),
        createTestRecipe({ id: 'somewhat-similar', title: 'Oatmeal Cookies' }),
      ]
      
      const matches = findSimilarRecipes(target, recipes, { minScore: 0.9 })
      
      expect(matches).toHaveLength(1)
      expect(matches[0].recipe.id).toBe('very-similar')
    })

    it('should exclude target recipe by default', () => {
      const target = createTestRecipe({ id: 'target' })
      const recipes = [
        target,
        createTestRecipe({ id: 'other' })
      ]
      
      const matches = findSimilarRecipes(target, recipes)
      
      expect(matches.every(m => m.recipe.id !== 'target')).toBe(true)
    })

    it('should include target recipe when requested', () => {
      const target = createTestRecipe({ id: 'target' })
      const recipes = [target]
      
      const matches = findSimilarRecipes(target, recipes, { includeTarget: true })
      
      expect(matches).toHaveLength(1)
      expect(matches[0].recipe.id).toBe('target')
      expect(matches[0].score.overall).toBe(1)
    })
  })

  describe('checkForDuplicates', () => {
    it('should detect duplicates for new recipes', () => {
      const newRecipe = {
        title: 'Chocolate Chip Cookies',
        ingredients: createTestRecipe().ingredients,
        instructions: createTestRecipe().instructions,
      }
      
      const existingRecipes = [
        createTestRecipe({ id: 'existing-1' }),
        createTestRecipe({ 
          id: 'existing-2', 
          title: 'Brownies',
          ingredients: [
            { id: '1', recipeId: 'existing-2', ingredient: 'chocolate', amount: 2, unit: 'cups', orderIndex: 0, createdAt: '2024-01-01' },
          ] as Ingredient[]
        }),
      ]
      
      const duplicates = checkForDuplicates(newRecipe, existingRecipes)
      
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0].recipe.id).toBe('existing-1')
      expect(duplicates[0].isDuplicate).toBe(true)
    })

    it('should handle partial recipe data', () => {
      const newRecipe = {
        title: 'Cookies',
      }
      
      const existingRecipes = [
        createTestRecipe({ id: 'existing' }),
      ]
      
      const duplicates = checkForDuplicates(newRecipe, existingRecipes)
      
      expect(duplicates).toHaveLength(0) // Too different with missing data
    })
  })

  describe('getSimilarityDescription', () => {
    it('should return correct descriptions for score ranges', () => {
      expect(getSimilarityDescription(0.95)).toBe('Likely duplicate')
      expect(getSimilarityDescription(0.85)).toBe('Likely duplicate')
      expect(getSimilarityDescription(0.80)).toBe('Very similar')
      expect(getSimilarityDescription(0.75)).toBe('Very similar')
      expect(getSimilarityDescription(0.65)).toBe('Similar')
      expect(getSimilarityDescription(0.60)).toBe('Similar')
      expect(getSimilarityDescription(0.50)).toBe('Different')
      expect(getSimilarityDescription(0)).toBe('Different')
    })
  })

  describe('getRecipeDifferences', () => {
    it('should identify all differences between recipes', () => {
      const recipe1 = createTestRecipe()
      const recipe2 = createTestRecipe({
        id: 'test-2',
        title: 'Choc Chip Cookies',
        servings: 36,
        prepTime: 20,
        ingredients: [
          ...createTestRecipe().ingredients.slice(0, -1), // All but chocolate chips
          { id: '9', recipeId: 'test-2', ingredient: 'dark chocolate chips', amount: 2, unit: 'cups', orderIndex: 8, createdAt: '2024-01-01' },
          { id: '10', recipeId: 'test-2', ingredient: 'nuts', amount: 1, unit: 'cup', orderIndex: 9, createdAt: '2024-01-01' },
        ] as Ingredient[],
        instructions: [
          ...createTestRecipe().instructions,
          { id: '7', recipeId: 'test-2', stepNumber: 7, instruction: 'Cool on wire rack', createdAt: '2024-01-01' },
        ]
      })
      
      const differences = getRecipeDifferences(recipe1, recipe2)
      
      expect(differences).toContain('Title: "Chocolate Chip Cookies" vs "Choc Chip Cookies"')
      expect(differences).toContain('Servings: 24 vs 36')
      expect(differences).toContain('Total time: 27 min vs 32 min')
      expect(differences).toContain('Steps: 6 vs 7')
      expect(differences.some(d => d.includes('Only in second') && d.includes('nuts'))).toBe(true)
    })

    it('should handle identical recipes', () => {
      const recipe1 = createTestRecipe()
      const recipe2 = createTestRecipe({ id: 'test-2' })
      
      const differences = getRecipeDifferences(recipe1, recipe2)
      
      expect(differences).toHaveLength(0)
    })

    it('should handle missing data', () => {
      const recipe1 = createTestRecipe({ servings: undefined, prepTime: undefined })
      const recipe2 = createTestRecipe({ id: 'test-2' })
      
      const differences = getRecipeDifferences(recipe1, recipe2)
      
      expect(differences).toContain('Servings: unspecified vs 24')
      expect(differences).toContain('Total time: 12 min vs 27 min')
    })
  })
})