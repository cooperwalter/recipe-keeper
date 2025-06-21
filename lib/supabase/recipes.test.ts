import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecipeService } from './recipes'
import { createClient } from '@/lib/supabase/client'
import type { CreateRecipeInput, UpdateRecipeInput } from '@/lib/types/recipe'

vi.mock('@/lib/supabase/client')

describe('RecipeService', () => {
  let service: RecipeService
  let mockSupabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>
    }
    from: ReturnType<typeof vi.fn>
  }

  // Create mock Supabase client with chainable methods
  const createMockChain = (overrides = {}) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      ...overrides,
    }
    
    // Make all methods return the chain for chaining
    Object.keys(chain).forEach(key => {
      if (key !== 'single' && typeof (chain as Record<string, unknown>)[key] === 'function') {
        ((chain as Record<string, unknown>)[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain)
      }
    })
    
    return chain
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
        }),
      },
      from: vi.fn(() => createMockChain()),
    }

    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)
    service = new RecipeService()
  })

  describe('createRecipe', () => {
    it('should create a new recipe', async () => {
      const input: CreateRecipeInput = {
        title: 'Test Recipe',
        description: 'A test recipe',
        prepTime: 10,
        cookTime: 20,
        servings: 4,
      }

      const mockRecipe = {
        id: 'recipe-id',
        title: input.title,
        description: input.description,
        prep_time: input.prepTime,
        cook_time: input.cookTime,
        servings: input.servings,
        created_by: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
        version: 1,
      }

      const mockChain = createMockChain({
        single: vi.fn().mockResolvedValue({ data: mockRecipe, error: null }),
      })
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await service.createRecipe(input)

      expect(mockSupabase.from).toHaveBeenCalledWith('recipes')
      expect(mockChain.insert).toHaveBeenCalledWith({
        title: input.title,
        description: input.description,
        prep_time: input.prepTime,
        cook_time: input.cookTime,
        servings: input.servings,
        is_public: false,
        source_name: undefined,
        source_notes: undefined,
        created_by: 'test-user-id',
      })
      expect(result).toEqual({
        id: mockRecipe.id,
        title: mockRecipe.title,
        description: mockRecipe.description,
        prepTime: mockRecipe.prep_time,
        cookTime: mockRecipe.cook_time,
        servings: mockRecipe.servings,
        createdBy: mockRecipe.created_by,
        createdAt: mockRecipe.created_at,
        updatedAt: mockRecipe.updated_at,
        isPublic: mockRecipe.is_public,
        sourceName: undefined,
        sourceNotes: undefined,
        version: mockRecipe.version,
        parentRecipeId: undefined,
      })
    })

    it('should throw error if creation fails', async () => {
      const input: CreateRecipeInput = {
        title: 'Test Recipe',
      }

      const mockChain = createMockChain({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      })
      mockSupabase.from.mockReturnValue(mockChain)

      await expect(service.createRecipe(input)).rejects.toThrow('Database error')
    })
  })

  describe('getRecipe', () => {
    it('should retrieve a recipe with all relations', async () => {
      const mockRecipeData = {
        id: 'recipe-id',
        title: 'Test Recipe',
        created_by: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
        version: 1,
        ingredients: [
          {
            id: 'ing-1',
            recipe_id: 'recipe-id',
            ingredient: 'Flour',
            amount: 2,
            unit: 'cups',
            order_index: 0,
            created_at: new Date().toISOString(),
          },
        ],
        instructions: [
          {
            id: 'inst-1',
            recipe_id: 'recipe-id',
            step_number: 1,
            instruction: 'Mix ingredients',
            created_at: new Date().toISOString(),
          },
        ],
        recipe_photos: [],
        recipe_category_mappings: [],
        recipe_tags: [{ tag: 'easy' }],
        favorites: [],
      }

      const mockChain = createMockChain({
        single: vi.fn().mockResolvedValue({ data: mockRecipeData, error: null }),
      })
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await service.getRecipe('recipe-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('recipes')
      expect(result).toBeTruthy()
      expect(result?.id).toBe('recipe-id')
      expect(result?.ingredients).toHaveLength(1)
      expect(result?.instructions).toHaveLength(1)
      // expect(result?.tags).toEqual(['easy'])  // Tags temporarily disabled
      expect(result?.isFavorite).toBe(false)
    })

    it('should return null if recipe not found', async () => {
      const mockChain = createMockChain({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      })
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await service.getRecipe('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateRecipe', () => {
    it('should update a recipe', async () => {
      const input: UpdateRecipeInput = {
        id: 'recipe-id',
        title: 'Updated Recipe',
        servings: 6,
      }

      const mockUpdatedRecipe = {
        id: input.id,
        title: input.title,
        servings: input.servings,
        created_by: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
        version: 2,
      }

      const mockChain = createMockChain({
        single: vi.fn().mockResolvedValue({ data: mockUpdatedRecipe, error: null }),
      })
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await service.updateRecipe(input)

      expect(mockSupabase.from).toHaveBeenCalledWith('recipes')
      expect(mockChain.update).toHaveBeenCalledWith({
        title: input.title,
        servings: input.servings,
        description: undefined,
        prep_time: undefined,
        cook_time: undefined,
        is_public: undefined,
        source_name: undefined,
        source_notes: undefined,
      })
      expect(result.title).toBe('Updated Recipe')
      expect(result.servings).toBe(6)
    })
  })

  describe('deleteRecipe', () => {
    it('should delete a recipe', async () => {
      const mockChain = createMockChain()
      mockChain.eq.mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue(mockChain)

      await service.deleteRecipe('recipe-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('recipes')
      expect(mockChain.delete).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'recipe-id')
    })

    it('should throw error if deletion fails', async () => {
      const mockChain = createMockChain()
      mockChain.eq.mockResolvedValue({ error: new Error('Cannot delete') })
      mockSupabase.from.mockReturnValue(mockChain)

      await expect(service.deleteRecipe('recipe-id')).rejects.toThrow('Cannot delete')
    })
  })

  describe('listRecipes', () => {
    it('should list recipes with pagination', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          title: 'Recipe 1',
          created_by: 'test-user-id',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_public: false,
          version: 1,
          ingredients: [],
          instructions: [],
          recipe_photos: [],
          recipe_category_mappings: [],
          recipe_tags: [],
          favorites: [],
        },
      ]

      const mockChain = createMockChain()
      mockChain.range.mockResolvedValue({ data: mockRecipes, error: null, count: 1 })
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await service.listRecipes({ limit: 10, offset: 0 })

      expect(result.recipes).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
    })

    it('should filter recipes by search query', async () => {
      const mockChain = createMockChain()
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 })
      mockSupabase.from.mockReturnValue(mockChain)

      await service.listRecipes({ query: 'pasta' })

      expect(mockChain.or).toHaveBeenCalledWith(
        'title.ilike.%pasta%,description.ilike.%pasta%'
      )
    })
  })

  describe('toggleFavorite', () => {
    it('should add favorite if not exists', async () => {
      // First call for checking existing favorite
      const checkChain = createMockChain({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      
      // Second call for inserting favorite
      const insertChain = createMockChain()
      insertChain.insert.mockResolvedValue({ error: null })
      
      mockSupabase.from
        .mockReturnValueOnce(checkChain)
        .mockReturnValueOnce(insertChain)

      const result = await service.toggleFavorite('recipe-id')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('favorites')
    })

    it('should remove favorite if exists', async () => {
      // First call for checking existing favorite
      const checkChain = createMockChain({
        single: vi.fn().mockResolvedValue({ data: { id: 'fav-id' }, error: null }),
      })
      
      // Second call for deleting favorite - needs two eq calls chained
      const deleteChain = createMockChain()
      // Override eq to return itself for chaining, and resolve on the second call
      let eqCallCount = 0
      deleteChain.eq.mockImplementation(() => {
        eqCallCount++
        if (eqCallCount === 2) {
          return Promise.resolve({ error: null })
        }
        return deleteChain
      })
      
      mockSupabase.from
        .mockReturnValueOnce(checkChain)
        .mockReturnValueOnce(deleteChain)

      const result = await service.toggleFavorite('recipe-id')

      expect(result).toBe(false)
    })
  })

  describe('ingredient management', () => {
    it('should add ingredients to a recipe', async () => {
      const inputs = [
        {
          recipeId: 'recipe-id',
          ingredient: 'Flour',
          amount: 2,
          unit: 'cups',
          orderIndex: 0,
        },
      ]

      const mockChain = createMockChain()
      mockChain.select.mockResolvedValue({
        data: inputs.map((input, i) => ({
          id: `ing-${i}`,
          recipe_id: input.recipeId,
          ingredient: input.ingredient,
          amount: input.amount,
          unit: input.unit,
          order_index: input.orderIndex,
          created_at: new Date().toISOString(),
        })),
        error: null,
      })
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await service.addIngredients(inputs)

      expect(result).toHaveLength(1)
      expect(result[0].ingredient).toBe('Flour')
    })

    it('should update ingredients by replacing all', async () => {
      const deleteChain = createMockChain()
      deleteChain.eq.mockResolvedValue({ error: null })
      
      const insertChain = createMockChain()
      insertChain.select.mockResolvedValue({ data: [], error: null })
      
      mockSupabase.from
        .mockReturnValueOnce(deleteChain)
        .mockReturnValueOnce(insertChain)

      const result = await service.updateIngredients('recipe-id', [])

      expect(result).toEqual([])
    })
  })

  describe.skip('tag management', () => {
    it('should add tags to a recipe', async () => {
      const mockChain = createMockChain()
      mockChain.insert.mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue(mockChain)

      await service.addTags('recipe-id', ['easy', 'quick'])

      expect(mockChain.insert).toHaveBeenCalledWith([
        { recipe_id: 'recipe-id', tag: 'easy' },
        { recipe_id: 'recipe-id', tag: 'quick' },
      ])
    })

    it('should ignore duplicate tag errors', async () => {
      const mockChain = createMockChain()
      mockChain.insert.mockResolvedValue({ error: { code: '23505' } })
      mockSupabase.from.mockReturnValue(mockChain)

      await expect(service.addTags('recipe-id', ['easy'])).resolves.not.toThrow()
    })
  })
})