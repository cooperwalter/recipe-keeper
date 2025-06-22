import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecipeService } from './recipes'
import { createMockRecipe, createMockIngredient, createMockInstruction, createMockSupabaseClient } from '@/lib/test-utils'
import { and, eq } from 'drizzle-orm'
import { recipes, ingredients, instructions, recipePhotos, recipeTags, recipeCategories, recipeCategoryMappings, favorites, recipeVersions } from './schema'

type MockChain = {
  select: ReturnType<typeof vi.fn>
  from: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  orderBy: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  offset: ReturnType<typeof vi.fn>
  leftJoin: ReturnType<typeof vi.fn>
  groupBy: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  values: ReturnType<typeof vi.fn>
  returning: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  execute: ReturnType<typeof vi.fn>
  then: ReturnType<typeof vi.fn>
}

// Mock the db module
vi.mock('./index', () => {
  const createMockChain = (): MockChain => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
      then: vi.fn((onFulfilled: (value: any[]) => any) => {
        // Mock the promise behavior
        return Promise.resolve([{ count: 0 }]).then(onFulfilled)
      }),
    }
    return chain
  }
  
  const mockDb = Object.assign(createMockChain(), {
    transaction: vi.fn((callback: (tx: any) => any) => callback(mockDb)),
    $count: vi.fn().mockResolvedValue(0),
  })
  
  return {
    db: mockDb,
    recipes: 'recipes',
    ingredients: 'ingredients',
    instructions: 'instructions',
    recipePhotos: 'recipePhotos',
    recipeTags: 'recipeTags',
    recipeCategories: 'recipeCategories',
    recipeCategoryMappings: 'recipeCategoryMappings',
    favorites: 'favorites',
    recipeVersions: 'recipeVersions',
  }
})

describe.skip('RecipeService', () => {
  let service: RecipeService
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockDb: MockChain & {
    transaction: ReturnType<typeof vi.fn>
    $count: ReturnType<typeof vi.fn>
  }
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked db
    const dbModule = await vi.importMock('./index')
    mockDb = (dbModule as { db: typeof mockDb }).db
    
    // Reset mock implementations
    mockDb.execute.mockResolvedValue([])
    mockDb.then = vi.fn((onFulfilled: (value: any[]) => any) => {
      return Promise.resolve([{ count: 0 }]).then(onFulfilled)
    })
    
    // Create mock Supabase client
    mockSupabase = createMockSupabaseClient()
    
    // Create service with mocked Supabase
    service = new RecipeService(mockSupabase as unknown as Parameters<typeof RecipeService>[0])
  })

  describe('listRecipes', () => {
    it('should list recipes with default parameters', async () => {
      const mockRecipes = [createMockRecipe()]
      mockDb.execute.mockResolvedValue(mockRecipes)
      mockDb.$count.mockResolvedValue(1)

      const result = await service.listRecipes({})

      expect(result).toEqual({
        recipes: mockRecipes,
        total: 1,
        hasMore: false,
      })
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalledWith(recipes)
      expect(mockDb.limit).toHaveBeenCalledWith(21)
    })

    it('should filter by search query', async () => {
      mockDb.execute.mockResolvedValue([])
      mockDb.$count.mockResolvedValue(0)

      await service.listRecipes({ query: 'pasta' })

      expect(mockDb.where).toHaveBeenCalled()
      const whereCall = mockDb.where.mock.calls[0][0]
      expect(whereCall).toBeDefined()
    })

    it('should filter by category', async () => {
      mockDb.execute.mockResolvedValue([])
      mockDb.$count.mockResolvedValue(0)

      await service.listRecipes({ categoryId: 'main-dish' })

      expect(mockDb.leftJoin).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should handle pagination', async () => {
      const mockRecipes = Array(21).fill(null).map((_, i) => 
        createMockRecipe({ id: `recipe-${i}` })
      )
      mockDb.execute.mockResolvedValue(mockRecipes)
      mockDb.$count.mockResolvedValue(25)

      const result = await service.listRecipes({ limit: 20, offset: 0 })

      expect(result.hasMore).toBe(true)
      expect(result.recipes).toHaveLength(20)
      expect(mockDb.limit).toHaveBeenCalledWith(21)
      expect(mockDb.offset).toHaveBeenCalledWith(0)
    })

    it('should order results', async () => {
      mockDb.execute.mockResolvedValue([])
      mockDb.$count.mockResolvedValue(0)

      await service.listRecipes({ 
        orderBy: 'title', 
        orderDirection: 'asc' 
      })

      expect(mockDb.orderBy).toHaveBeenCalled()
    })
  })

  describe('getRecipe', () => {
    it('should get a recipe by id', async () => {
      const mockRecipe = createMockRecipe()
      mockDb.execute.mockResolvedValue([mockRecipe])

      const result = await service.getRecipe('recipe-id')

      expect(result).toEqual(mockRecipe)
      expect(mockDb.where).toHaveBeenCalledWith(
        and(eq(recipes.id, 'recipe-id'), eq(recipes.deleted, false))
      )
    })

    it('should return null if recipe not found', async () => {
      mockDb.execute.mockResolvedValue([])

      const result = await service.getRecipe('nonexistent')

      expect(result).toBeNull()
    })

    it('should include all relations', async () => {
      const mockRecipe = createMockRecipe({
        ingredients: [createMockIngredient()],
        instructions: [createMockInstruction()],
      })
      mockDb.execute.mockResolvedValue([mockRecipe])

      await service.getRecipe('recipe-id')

      expect(mockDb.leftJoin).toHaveBeenCalledTimes(6) // All the joins
    })
  })

  describe('createRecipe', () => {
    it('should create a recipe with all fields', async () => {
      const recipeData = {
        title: 'New Recipe',
        description: 'A new recipe',
        ingredients: [
          { ingredient: 'Flour', amount: 2, unit: 'cups' },
        ],
        instructions: ['Mix ingredients'],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        categoryId: 'main-dish',
        tags: ['easy', 'quick'],
        sourceName: 'Test Source',
        sourceNotes: 'Test notes',
        isPublic: false,
      }

      const mockCreatedRecipe = createMockRecipe({ id: 'new-id' })
      mockDb.returning.mockResolvedValue([{ id: 'new-id' }])
      mockDb.execute.mockResolvedValue([mockCreatedRecipe])

      const result = await service.createRecipe(recipeData)

      expect(result).toEqual(mockCreatedRecipe)
      expect(mockDb.insert).toHaveBeenCalledWith(recipes)
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Recipe',
          description: 'A new recipe',
          prepTime: 10,
          cookTime: 20,
          servings: 4,
          sourceName: 'Test Source',
          sourceNotes: 'Test notes',
          isPublic: false,
          createdBy: 'test-user-id',
        })
      )
    })

    it('should use transaction for creating recipe with relations', async () => {
      const recipeData = {
        title: 'New Recipe',
        ingredients: [{ ingredient: 'Sugar', amount: 1, unit: 'cup' }],
        instructions: ['Step 1'],
      }

      mockDb.returning.mockResolvedValue([{ id: 'new-id' }])

      await service.createRecipe(recipeData)

      expect(mockDb.transaction).toHaveBeenCalled()
    })
  })

  describe('updateRecipe', () => {
    it('should update basic recipe fields', async () => {
      await service.updateRecipe('recipe-id', {
        title: 'Updated Title',
        description: 'Updated description',
      })

      expect(mockDb.update).toHaveBeenCalledWith(recipes)
      expect(mockDb.set).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: 'Updated description',
        updatedAt: expect.any(Date),
      })
      expect(mockDb.where).toHaveBeenCalledWith(eq(recipes.id, 'recipe-id'))
    })

    it('should handle partial updates', async () => {
      await service.updateRecipe('recipe-id', {
        servings: 6,
      })

      expect(mockDb.set).toHaveBeenCalledWith({
        servings: 6,
        updatedAt: expect.any(Date),
      })
    })
  })

  describe('deleteRecipe', () => {
    it('should soft delete a recipe', async () => {
      await service.deleteRecipe('recipe-id')

      expect(mockDb.update).toHaveBeenCalledWith(recipes)
      expect(mockDb.set).toHaveBeenCalledWith({
        deleted: true,
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
      expect(mockDb.where).toHaveBeenCalledWith(eq(recipes.id, 'recipe-id'))
    })
  })

  describe('toggleFavorite', () => {
    it('should add recipe to favorites', async () => {
      mockDb.execute.mockResolvedValue([])

      await service.toggleFavorite('recipe-id')

      expect(mockDb.insert).toHaveBeenCalledWith(favorites)
      expect(mockDb.values).toHaveBeenCalledWith({
        userId: 'test-user-id',
        recipeId: 'recipe-id',
      })
    })

    it('should remove recipe from favorites if already favorited', async () => {
      mockDb.execute.mockResolvedValue([{ id: 'fav-id' }])

      await service.toggleFavorite('recipe-id')

      expect(mockDb.delete).toHaveBeenCalledWith(favorites)
      expect(mockDb.where).toHaveBeenCalledWith(
        and(
          eq(favorites.userId, 'test-user-id'),
          eq(favorites.recipeId, 'recipe-id')
        )
      )
    })
  })

  describe('version management', () => {
    it('should restore a version', async () => {
      // First mock - get version data
      mockDb.execute.mockResolvedValueOnce([{
        versionNumber: 1,
        data: {
          title: 'Old Title',
          description: 'Old description',
          ingredients: [{ ingredient: 'Sugar', amount: 1, unit: 'cup' }],
          instructions: [{ step: 1, instruction: 'Old step' }],
        },
      }])
      // Second mock - check recipe exists
      .mockResolvedValueOnce([{ id: 'recipe-id', createdBy: 'test-user-id' }])
      // Other mocks for transaction operations
      .mockResolvedValue([])

      await service.restoreVersion('recipe-id', 1)

      expect(mockDb.transaction).toHaveBeenCalled()
    })
  })
})