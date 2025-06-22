import { RecipeWithRelations, Ingredient, Instruction, RecipePhoto, Category } from '@/lib/types/recipe'
import { User } from '@supabase/supabase-js'

/**
 * Factory functions for creating test data with sensible defaults
 */

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {
      full_name: 'Test User',
    },
    ...overrides,
  }
}

export function createMockRecipe(overrides?: Partial<RecipeWithRelations>): RecipeWithRelations {
  const now = new Date().toISOString()
  return {
    id: 'recipe-id',
    title: 'Test Recipe',
    description: 'A delicious test recipe',
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    createdBy: 'test-user-id',
    createdAt: now,
    updatedAt: now,
    isPublic: false,
    sourceName: null,
    sourceNotes: null,
    version: 1,
    parentRecipeId: null,
    ingredients: [],
    instructions: [],
    photos: [],
    categories: [],
    tags: [],
    badges: [],
    isFavorite: false,
    ...overrides,
  }
}

export function createMockIngredient(overrides?: Partial<Ingredient>): Ingredient {
  return {
    id: 'ingredient-id',
    recipeId: 'recipe-id',
    ingredient: 'Test Ingredient',
    amount: 1,
    unit: 'cup',
    notes: null,
    optional: false,
    ingredientOrder: 0,
    ...overrides,
  }
}

export function createMockInstruction(overrides?: Partial<Instruction>): Instruction {
  return {
    id: 'instruction-id',
    recipeId: 'recipe-id',
    step: 1,
    instruction: 'Test instruction step',
    ...overrides,
  }
}

export function createMockRecipePhoto(overrides?: Partial<RecipePhoto>): RecipePhoto {
  return {
    id: 'photo-id',
    recipeId: 'recipe-id',
    photoUrl: 'https://example.com/photo.jpg',
    isOriginal: false,
    caption: null,
    uploadedBy: 'test-user-id',
    uploadedAt: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockCategory(overrides?: Partial<Category>): Category {
  return {
    id: 'category-id',
    name: 'Test Category',
    slug: 'test-category',
    parentId: null,
    orderIndex: 0,
    ...overrides,
  }
}

export function createMockRecipeListResponse(overrides?: Partial<{
  recipes: RecipeWithRelations[]
  total: number
  hasMore: boolean
}>): {
  recipes: RecipeWithRelations[]
  total: number
  hasMore: boolean
} {
  return {
    recipes: [],
    total: 0,
    hasMore: false,
    ...overrides,
  }
}

export function createMockRecipeFormData(overrides?: Partial<{
  title: string
  description: string
  ingredients: Array<{ ingredient: string; amount: number; unit: string }>
  instructions: string[]
  prepTime: number
  cookTime: number
  servings: number
  categoryId?: string
  tags: string[]
  sourceName: string
  sourceNotes: string
  isPublic: boolean
}>): {
  title: string
  description: string
  ingredients: Array<{ ingredient: string; amount: number; unit: string }>
  instructions: string[]
  prepTime: number
  cookTime: number
  servings: number
  categoryId?: string
  tags: string[]
  sourceName: string
  sourceNotes: string
  isPublic: boolean
} {
  return {
    title: 'New Recipe',
    description: 'A new test recipe',
    ingredients: [
      { ingredient: 'Flour', amount: 2, unit: 'cups' },
      { ingredient: 'Sugar', amount: 1, unit: 'cup' },
    ],
    instructions: ['Mix ingredients', 'Bake for 30 minutes'],
    prepTime: 10,
    cookTime: 30,
    servings: 8,
    categoryId: undefined,
    tags: [],
    sourceName: '',
    sourceNotes: '',
    isPublic: false,
    ...overrides,
  }
}