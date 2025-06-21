import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createAuthenticatedRequest,
  createJsonRequest,
  expectAuthError,
  expectSuccess,
  expectError,
  createMockRecipe,
  createMockRecipeFormData,
  createMockRecipeListResponse,
  createMockSupabaseClient,
  createMockRecipeService
} from '@/lib/test-utils'

// Mock dependencies before importing the route
const mockSupabase = createMockSupabaseClient()
const mockRecipeService = createMockRecipeService()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => mockSupabase)
}))

vi.mock('@/lib/db/recipes', () => ({
  RecipeService: vi.fn().mockImplementation(() => mockRecipeService)
}))

// Import route handlers
import { GET, POST } from './route'

describe.skip('/api/recipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations to default
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
    mockRecipeService.listRecipes.mockResolvedValue(createMockRecipeListResponse())
    mockRecipeService.createRecipe.mockResolvedValue(createMockRecipe())
    mockRecipeService.getRecipe.mockResolvedValue(createMockRecipe())
  })

  describe('GET /api/recipes', () => {
    it('should return recipes list for authenticated user', async () => {
      const mockResponse = createMockRecipeListResponse()
      mockRecipeService.listRecipes.mockResolvedValueOnce(mockResponse)
      
      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes')
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data).toEqual(mockResponse)
      expect(mockRecipeService.listRecipes).toHaveBeenCalled()
    })

    it('should handle query parameters', async () => {
      const url = 'http://localhost:3000/api/recipes?query=pasta&categoryId=main-dish&limit=10&offset=20&orderBy=title&orderDirection=asc'
      const request = new NextRequest(url)

      await GET(request)

      expect(mockRecipeService.listRecipes).toHaveBeenCalledWith({
        query: 'pasta',
        categoryId: 'main-dish',
        limit: 10,
        offset: 20,
        orderBy: 'title',
        orderDirection: 'asc',
        createdBy: 'test-user-id',  // Now defaults to current user
        isPublic: undefined,
        isFavorite: undefined,
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes')
      const response = await GET(request)
      
      await expectAuthError(response)
    })

    it('should allow requesting public recipes explicitly', async () => {
      const request = new NextRequest('http://localhost:3000/api/recipes?isPublic=true')
      
      await GET(request)

      expect(mockRecipeService.listRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: undefined,  // Should not default to user when explicitly requesting public
          isPublic: true,
        })
      )
    })

    it('should handle errors gracefully', async () => {
      mockRecipeService.listRecipes.mockRejectedValueOnce(new Error('Database error'))

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes')
      const response = await GET(request)
      
      await expectError(response, 500, 'Failed to list recipes')
    })
  })

  describe('POST /api/recipes', () => {
    it('should create a new recipe', async () => {
      const recipeData = createMockRecipeFormData({
        title: 'New Recipe',
        description: 'A delicious recipe',
        servings: 4,
        ingredients: [],
        instructions: [],
      })
      const createdRecipe = createMockRecipe({ id: 'recipe-id' })
      
      mockRecipeService.createRecipe.mockResolvedValueOnce(createdRecipe)
      mockRecipeService.getRecipe.mockResolvedValueOnce(createdRecipe)

      const request = createJsonRequest('http://localhost:3000/api/recipes', recipeData)
      const response = await POST(request)
      const data = await expectSuccess(response, 201)

      expect(mockRecipeService.createRecipe).toHaveBeenCalledWith({
        title: 'New Recipe',
        description: 'A delicious recipe',
        ingredients: [],
        instructions: [],
        prepTime: 10,
        cookTime: 30,
        servings: 4,
        categoryId: undefined,
        sourceName: '',
        sourceNotes: '',
        isPublic: false,
      })
      expect(data.id).toBe('recipe-id')
    })

    it('should create recipe with ingredients and instructions', async () => {
      const recipeData = {
        title: 'New Recipe',
        ingredients: [
          { ingredient: 'Flour', amount: 2, unit: 'cups' },
        ],
        instructions: ['Mix ingredients'],
        categoryId: 'cat-1',
      }

      const request = new NextRequest('http://localhost:3000/api/recipes', {
        method: 'POST',
        body: JSON.stringify(recipeData),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockRecipeService.createRecipe).toHaveBeenCalledWith({
        title: 'New Recipe',
        description: undefined,
        ingredients: [
          { ingredient: 'Flour', amount: 2, unit: 'cups' },
        ],
        instructions: ['Mix ingredients'],
        prepTime: undefined,
        cookTime: undefined,
        servings: undefined,
        categoryId: 'cat-1',
        sourceName: undefined,
        sourceNotes: undefined,
        isPublic: false,
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = createJsonRequest('http://localhost:3000/api/recipes', { title: 'Test' })
      const response = await POST(request)
      
      await expectAuthError(response)
    })

    it('should handle errors gracefully', async () => {
      mockRecipeService.createRecipe.mockRejectedValueOnce(new Error('Database error'))

      const request = createJsonRequest('http://localhost:3000/api/recipes', { title: 'Test' })
      const response = await POST(request)
      
      await expectError(response, 500, 'Failed to create recipe')
    })
  })
})