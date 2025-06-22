import { vi } from 'vitest'
import { createMockRecipe, createMockRecipeListResponse } from '../factories'

/**
 * Mock implementations for common services
 */

export function createMockRecipeService(overrides?: Partial<ReturnType<typeof createMockRecipeService>>) {
  return {
    listRecipes: vi.fn().mockResolvedValue(createMockRecipeListResponse()),
    getRecipe: vi.fn().mockResolvedValue(createMockRecipe()),
    createRecipe: vi.fn().mockResolvedValue(createMockRecipe()),
    updateRecipe: vi.fn().mockResolvedValue(createMockRecipe()),
    deleteRecipe: vi.fn().mockResolvedValue(undefined),
    addIngredients: vi.fn().mockResolvedValue([]),
    updateIngredient: vi.fn().mockResolvedValue(undefined),
    deleteIngredient: vi.fn().mockResolvedValue(undefined),
    addInstructions: vi.fn().mockResolvedValue([]),
    updateInstruction: vi.fn().mockResolvedValue(undefined),
    deleteInstruction: vi.fn().mockResolvedValue(undefined),
    addCategories: vi.fn().mockResolvedValue(undefined),
    addTags: vi.fn().mockResolvedValue(undefined),
    addRecipePhoto: vi.fn().mockResolvedValue(undefined),
    deleteRecipePhoto: vi.fn().mockResolvedValue(undefined),
    toggleFavorite: vi.fn().mockResolvedValue(undefined),
    createVersion: vi.fn().mockResolvedValue(undefined),
    getVersions: vi.fn().mockResolvedValue([]),
    getVersion: vi.fn().mockResolvedValue(null),
    restoreVersion: vi.fn().mockResolvedValue(createMockRecipe()),
    duplicateRecipe: vi.fn().mockResolvedValue(createMockRecipe()),
    checkDuplicates: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

export function setupRecipeServiceMock(overrides?: Partial<ReturnType<typeof createMockRecipeService>>) {
  const mockService = createMockRecipeService(overrides)
  
  vi.mock('@/lib/db/recipes', () => ({
    RecipeService: vi.fn(() => mockService),
  }))
  
  return mockService
}

export function createMockStorageService() {
  return {
    uploadRecipePhoto: vi.fn().mockResolvedValue('https://example.com/photo.jpg'),
    uploadOCRImage: vi.fn().mockResolvedValue('https://example.com/ocr.jpg'),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getPublicUrl: vi.fn().mockReturnValue('https://example.com/public.jpg'),
  }
}

export function setupStorageServiceMock() {
  const mockService = createMockStorageService()
  
  vi.mock('@/lib/supabase/storage', () => mockService)
  
  return mockService
}

export function createMockCategoryService() {
  return {
    getCategories: vi.fn().mockResolvedValue([]),
    createCategory: vi.fn().mockResolvedValue({ id: 'cat-id', name: 'New Category' }),
  }
}

export function setupCategoryServiceMock() {
  const mockService = createMockCategoryService()
  
  vi.mock('@/lib/db/categories', () => ({
    CategoryService: vi.fn(() => mockService),
  }))
  
  return mockService
}