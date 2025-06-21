/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'
import * as recipeSimilarity from '@/lib/utils/recipe-similarity'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/db/recipes')
vi.mock('@/lib/utils/recipe-similarity')

describe('POST /api/recipes/check-duplicates', () => {
  let mockSupabase: any
  let mockRecipeService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } }
        })
      }
    }

    mockRecipeService = {
      listRecipes: vi.fn().mockResolvedValue({
        recipes: [
          {
            id: 'existing-1',
            title: 'Chocolate Chip Cookies',
            ingredients: [
              { ingredient: 'flour', amount: 2, unit: 'cups' },
              { ingredient: 'sugar', amount: 1, unit: 'cup' },
              { ingredient: 'chocolate chips', amount: 2, unit: 'cups' },
            ],
            instructions: [
              { instruction: 'Mix ingredients' },
              { instruction: 'Bake at 350F' },
            ],
          },
          {
            id: 'existing-2',
            title: 'Brownies',
            ingredients: [
              { ingredient: 'chocolate', amount: 1, unit: 'cup' },
              { ingredient: 'flour', amount: 0.5, unit: 'cup' },
            ],
            instructions: [
              { instruction: 'Melt chocolate' },
              { instruction: 'Mix and bake' },
            ],
          },
        ],
        total: 2,
        hasMore: false,
      })
    }

    ;(createClient as any).mockResolvedValue(mockSupabase)
    ;(RecipeService as any).mockImplementation(() => mockRecipeService)
  })

  it('should return 401 for unauthenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null }
    })

    const request = new NextRequest('http://localhost:3000/api/recipes/check-duplicates', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Recipe' }),
    })

    const response = await POST(request)
    
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  it('should return 400 if title is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/recipes/check-duplicates', {
      method: 'POST',
      body: JSON.stringify({ ingredients: [] }),
    })

    const response = await POST(request)
    
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Recipe title is required for duplicate checking'
    })
  })

  it('should check for duplicates and return matches', async () => {
    ;(recipeSimilarity.checkForDuplicates as any).mockReturnValue([
      {
        recipe: {
          id: 'existing-1',
          title: 'Chocolate Chip Cookies',
          description: 'Classic cookies',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        score: {
          overall: 0.92,
          titleSimilarity: 0.95,
          ingredientSimilarity: 0.90,
          instructionSimilarity: 0.88,
          servingsSimilarity: 1.0,
          timeSimilarity: 0.8,
        },
        isDuplicate: true,
      }
    ])

    const request = new NextRequest('http://localhost:3000/api/recipes/check-duplicates', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Choc Chip Cookies',
        ingredients: [
          { ingredient: 'flour', amount: '2', unit: 'cups' },
          { ingredient: 'sugar', amount: '1', unit: 'cup' },
          { ingredient: 'chocolate chips', amount: '2', unit: 'cups' },
        ],
        instructions: [
          'Mix dry ingredients',
          'Bake at 350 degrees',
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual({
      duplicates: [
        {
          recipe: {
            id: 'existing-1',
            title: 'Chocolate Chip Cookies',
            description: 'Classic cookies',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          score: {
            overall: 0.92,
            titleSimilarity: 0.95,
            ingredientSimilarity: 0.90,
            instructionSimilarity: 0.88,
            servingsSimilarity: 1.0,
            timeSimilarity: 0.8,
          },
          isDuplicate: true,
        }
      ],
      totalChecked: 2,
    })

    // Verify the recipe service was called correctly
    expect(mockRecipeService.listRecipes).toHaveBeenCalledWith({
      createdBy: 'test-user-id',
      limit: 1000,
    })

    // Verify checkForDuplicates was called with the right data
    expect(recipeSimilarity.checkForDuplicates).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Choc Chip Cookies',
        ingredients: expect.arrayContaining([
          expect.objectContaining({ ingredient: 'flour' })
        ]),
      }),
      expect.any(Array)
    )
  })

  it('should handle empty results when no duplicates found', async () => {
    ;(recipeSimilarity.checkForDuplicates as any).mockReturnValue([])

    const request = new NextRequest('http://localhost:3000/api/recipes/check-duplicates', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Completely Unique Recipe',
        ingredients: [
          { ingredient: 'unique ingredient', amount: '1', unit: 'cup' },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual({
      duplicates: [],
      totalChecked: 2,
    })
  })

  it('should handle errors gracefully', async () => {
    mockRecipeService.listRecipes.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/recipes/check-duplicates', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Recipe' }),
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to check for duplicates' })
  })
})