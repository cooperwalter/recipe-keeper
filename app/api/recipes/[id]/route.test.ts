import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  createAuthenticatedRequest,
  createJsonRequest,
  expectAuthError,
  expectSuccess,
  expectError,
  createMockRecipe,
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
import { GET, PUT, DELETE } from './route'

describe.skip('/api/recipes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations to default
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
    mockRecipeService.getRecipe.mockResolvedValue(createMockRecipe())
    mockRecipeService.updateRecipe.mockResolvedValue(undefined)
    mockRecipeService.deleteRecipe.mockResolvedValue(undefined)
    mockRecipeService.updateIngredient.mockResolvedValue(undefined)
    mockRecipeService.addIngredients.mockResolvedValue([])
    mockRecipeService.deleteInstruction.mockResolvedValue(undefined)
    mockRecipeService.addInstructions.mockResolvedValue([])
  })
  
  describe('GET /api/recipes/[id]', () => {
    it('should return a recipe by id', async () => {
      const mockRecipe = createMockRecipe({ id: 'recipe-123' })
      mockRecipeService.getRecipe.mockResolvedValueOnce(mockRecipe)

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes/recipe-123')
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      const data = await expectSuccess(response)

      expect(data).toEqual(mockRecipe)
      expect(mockRecipeService.getRecipe).toHaveBeenCalledWith('recipe-123')
    })

    it('should return 404 if recipe not found', async () => {
      mockRecipeService.getRecipe.mockResolvedValueOnce(null)

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes/recipe-123')
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      
      await expectError(response, 404, 'Recipe not found')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes/recipe-123')
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      
      await expectAuthError(response)
    })

    it('should handle errors gracefully', async () => {
      mockRecipeService.getRecipe.mockRejectedValueOnce(new Error('Database error'))

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes/recipe-123')
      const response = await GET(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      
      await expectError(response, 500, 'Failed to fetch recipe')
    })
  })

  describe('PUT /api/recipes/[id]', () => {
    it('should update a recipe', async () => {
      const updateData = {
        title: 'Updated Recipe',
        description: 'Updated description',
        servings: 6,
      }
      const updatedRecipe = createMockRecipe({ ...updateData, id: 'recipe-123' })
      
      mockRecipeService.updateRecipe.mockResolvedValueOnce(undefined)
      mockRecipeService.getRecipe.mockResolvedValueOnce(updatedRecipe)

      const request = createJsonRequest(
        'http://localhost:3000/api/recipes/recipe-123',
        updateData,
        'PUT'
      )
      const response = await PUT(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      const data = await expectSuccess(response)

      expect(data).toEqual(updatedRecipe)
      expect(mockRecipeService.updateRecipe).toHaveBeenCalledWith('recipe-123', updateData)
      expect(mockRecipeService.getRecipe).toHaveBeenCalledWith('recipe-123')
    })

    it('should handle ingredient updates', async () => {
      const updateData = {
        ingredients: [
          { id: 'ing-1', ingredient: 'Updated Flour', amount: 3, unit: 'cups' },
          { ingredient: 'New Sugar', amount: 1, unit: 'cup' },
        ],
      }

      mockRecipeService.updateRecipe.mockResolvedValueOnce(undefined)
      mockRecipeService.updateIngredient.mockResolvedValueOnce(undefined)
      mockRecipeService.addIngredients.mockResolvedValueOnce([])
      mockRecipeService.getRecipe.mockResolvedValueOnce(createMockRecipe())

      const request = createJsonRequest(
        'http://localhost:3000/api/recipes/recipe-123',
        updateData,
        'PUT'
      )
      const response = await PUT(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      await expectSuccess(response)

      expect(mockRecipeService.updateIngredient).toHaveBeenCalledWith(
        'recipe-123',
        'ing-1',
        { ingredient: 'Updated Flour', amount: 3, unit: 'cups' }
      )
      expect(mockRecipeService.addIngredients).toHaveBeenCalledWith(
        'recipe-123',
        [{ ingredient: 'New Sugar', amount: 1, unit: 'cup' }]
      )
    })

    it('should handle instruction updates', async () => {
      const updateData = {
        instructions: ['Step 1', 'Step 2', 'Step 3'],
      }

      mockRecipeService.updateRecipe.mockResolvedValueOnce(undefined)
      mockRecipeService.deleteInstruction.mockResolvedValueOnce(undefined)
      mockRecipeService.addInstructions.mockResolvedValueOnce([])
      mockRecipeService.getRecipe.mockResolvedValueOnce(createMockRecipe())

      const request = createJsonRequest(
        'http://localhost:3000/api/recipes/recipe-123',
        updateData,
        'PUT'
      )
      const response = await PUT(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      await expectSuccess(response)

      expect(mockRecipeService.addInstructions).toHaveBeenCalledWith(
        'recipe-123',
        ['Step 1', 'Step 2', 'Step 3']
      )
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = createJsonRequest(
        'http://localhost:3000/api/recipes/recipe-123',
        { title: 'Test' },
        'PUT'
      )
      const response = await PUT(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      
      await expectAuthError(response)
    })

    it('should handle errors gracefully', async () => {
      mockRecipeService.updateRecipe.mockRejectedValueOnce(new Error('Database error'))

      const request = createJsonRequest(
        'http://localhost:3000/api/recipes/recipe-123',
        { title: 'Test' },
        'PUT'
      )
      const response = await PUT(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      
      await expectError(response, 500, 'Failed to update recipe')
    })
  })

  describe('DELETE /api/recipes/[id]', () => {
    it('should delete a recipe', async () => {
      mockRecipeService.deleteRecipe.mockResolvedValueOnce(undefined)

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes/recipe-123')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      
      expect(response.status).toBe(204)
      expect(mockRecipeService.deleteRecipe).toHaveBeenCalledWith('recipe-123')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes/recipe-123')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      
      await expectAuthError(response)
    })

    it('should handle errors gracefully', async () => {
      mockRecipeService.deleteRecipe.mockRejectedValueOnce(new Error('Database error'))

      const request = createAuthenticatedRequest('http://localhost:3000/api/recipes/recipe-123')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'recipe-123' }) })
      
      await expectError(response, 500, 'Failed to delete recipe')
    })
  })
})