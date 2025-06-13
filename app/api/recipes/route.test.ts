import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { RecipeService } from '@/lib/supabase/recipes'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/recipes')
vi.mock('@/lib/supabase/server')

describe('/api/recipes', () => {
  let mockRecipeService: {
    listRecipes: ReturnType<typeof vi.fn>
    createRecipe: ReturnType<typeof vi.fn>
    addIngredients: ReturnType<typeof vi.fn>
    addInstructions: ReturnType<typeof vi.fn>
    addCategories: ReturnType<typeof vi.fn>
    addTags: ReturnType<typeof vi.fn>
    getRecipe: ReturnType<typeof vi.fn>
  }
  let mockSupabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockRecipeService = {
      listRecipes: vi.fn().mockResolvedValue({
        recipes: [],
        total: 0,
        hasMore: false,
      }),
      createRecipe: vi.fn().mockResolvedValue({
        id: 'recipe-id',
        title: 'Test Recipe',
      }),
      addIngredients: vi.fn().mockResolvedValue([]),
      addInstructions: vi.fn().mockResolvedValue([]),
      addCategories: vi.fn().mockResolvedValue(undefined),
      addTags: vi.fn().mockResolvedValue(undefined),
      getRecipe: vi.fn().mockResolvedValue({
        id: 'recipe-id',
        title: 'Test Recipe',
        ingredients: [],
        instructions: [],
      }),
    }

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
        }),
      },
    }

    ;(RecipeService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockRecipeService)
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })

  describe('GET /api/recipes', () => {
    it('should return recipes list for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/recipes')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        recipes: [],
        total: 0,
        hasMore: false,
      })
      expect(mockRecipeService.listRecipes).toHaveBeenCalled()
    })

    it('should handle query parameters', async () => {
      const url = 'http://localhost:3000/api/recipes?query=pasta&categories=main-dish,side-dish&limit=10'
      const request = new NextRequest(url)

      await GET(request)

      expect(mockRecipeService.listRecipes).toHaveBeenCalledWith({
        query: 'pasta',
        categories: ['main-dish', 'side-dish'],
        limit: 10,
        tags: undefined,
        createdBy: undefined,
        isPublic: undefined,
        isFavorite: undefined,
        offset: undefined,
        orderBy: undefined,
        orderDirection: undefined,
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      })

      const request = new NextRequest('http://localhost:3000/api/recipes')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle errors gracefully', async () => {
      mockRecipeService.listRecipes.mockRejectedValueOnce(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/recipes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to list recipes')
    })
  })

  describe('POST /api/recipes', () => {
    it('should create a new recipe', async () => {
      const recipeData = {
        title: 'New Recipe',
        description: 'A delicious recipe',
        servings: 4,
      }

      const request = new NextRequest('http://localhost:3000/api/recipes', {
        method: 'POST',
        body: JSON.stringify(recipeData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(mockRecipeService.createRecipe).toHaveBeenCalledWith(recipeData)
      expect(data.id).toBe('recipe-id')
    })

    it('should create recipe with ingredients and instructions', async () => {
      const recipeData = {
        title: 'New Recipe',
        ingredients: [
          { ingredient: 'Flour', amount: 2, unit: 'cups' },
        ],
        instructions: [
          { instruction: 'Mix ingredients' },
        ],
        categoryIds: ['cat-1'],
        tags: ['easy', 'quick'],
      }

      const request = new NextRequest('http://localhost:3000/api/recipes', {
        method: 'POST',
        body: JSON.stringify(recipeData),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockRecipeService.addIngredients).toHaveBeenCalled()
      expect(mockRecipeService.addInstructions).toHaveBeenCalled()
      expect(mockRecipeService.addCategories).toHaveBeenCalledWith('recipe-id', ['cat-1'])
      expect(mockRecipeService.addTags).toHaveBeenCalledWith('recipe-id', ['easy', 'quick'])
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      })

      const request = new NextRequest('http://localhost:3000/api/recipes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should handle errors gracefully', async () => {
      mockRecipeService.createRecipe.mockRejectedValueOnce(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/recipes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create recipe')
    })
  })
})