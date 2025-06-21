/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { RecipeUrlParser } from '@/lib/services/recipe-url-parser'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/services/recipe-url-parser')

import { createClient } from '@/lib/supabase/server'

describe('POST /api/recipes/url/extract', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn()
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  it('should extract recipe successfully', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } }
    })

    // Mock recipe extraction
    const mockExtractedRecipe = {
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: ['Ingredient 1', 'Ingredient 2'],
      instructions: ['Step 1', 'Step 2'],
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      sourceName: 'example.com',
      sourceUrl: 'https://example.com/recipe',
      image: 'https://example.com/image.jpg',
      keywords: ['test', 'recipe']
    }

    const mockParser = {
      extractFromUrl: vi.fn().mockResolvedValueOnce(mockExtractedRecipe)
    }
    ;(RecipeUrlParser as any).mockImplementation(() => mockParser)

    // Create request
    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' })
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Verify
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.recipe).toEqual({
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: ['Ingredient 1', 'Ingredient 2'],
      instructions: ['Step 1', 'Step 2'],
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      sourceName: 'example.com',
      sourceUrl: 'https://example.com/recipe',
      imageUrl: 'https://example.com/image.jpg',
      metadata: {
        category: undefined,
        cuisine: undefined,
        yield: undefined,
        nutrition: undefined
      }
    })
    expect(data.extractedFrom).toBe('https://example.com/recipe')
    expect(mockParser.extractFromUrl).toHaveBeenCalledWith('https://example.com/recipe')
  })

  it('should return 401 for unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null }
    })

    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 for missing URL', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } }
    })

    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL is required')
  })

  it('should return 400 for invalid URL format', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } }
    })

    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({ url: 'not-a-url' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid URL format')
  })

  it('should handle extraction errors - no recipe found', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } }
    })

    const mockParser = {
      extractFromUrl: vi.fn().mockRejectedValueOnce(new Error('No valid recipe data found on this page'))
    }
    ;(RecipeUrlParser as any).mockImplementation(() => mockParser)

    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/not-a-recipe' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error).toBe('No recipe found')
    expect(data.message).toContain('does not appear to contain a recipe')
  })

  it('should handle extraction errors - failed to fetch', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } }
    })

    const mockParser = {
      extractFromUrl: vi.fn().mockRejectedValueOnce(new Error('Failed to fetch URL: 404 Not Found'))
    }
    ;(RecipeUrlParser as any).mockImplementation(() => mockParser)

    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/404' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error).toBe('Could not access URL')
    expect(data.message).toContain('Unable to access the provided URL')
  })

  it('should handle general extraction errors', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } }
    })

    const mockParser = {
      extractFromUrl: vi.fn().mockRejectedValueOnce(new Error('Unknown error'))
    }
    ;(RecipeUrlParser as any).mockImplementation(() => mockParser)

    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to extract recipe')
    expect(data.message).toContain('An error occurred while extracting')
  })

  it('should handle recipes with partial data', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } }
    })

    const mockExtractedRecipe = {
      title: 'Minimal Recipe',
      ingredients: ['One ingredient'],
      // Other fields are undefined
    }

    const mockParser = {
      extractFromUrl: vi.fn().mockResolvedValueOnce(mockExtractedRecipe)
    }
    ;(RecipeUrlParser as any).mockImplementation(() => mockParser)

    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/minimal' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe.title).toBe('Minimal Recipe')
    expect(data.recipe.ingredients).toEqual(['One ingredient'])
    expect(data.recipe.instructions).toEqual([])
    expect(data.recipe.description).toBe('')
    expect(data.recipe.prepTime).toBeUndefined()
  })

  it('should include metadata fields', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } }
    })

    const mockExtractedRecipe = {
      title: 'Full Recipe',
      ingredients: ['Ingredient'],
      category: 'Main Course',
      cuisine: 'Italian',
      yield: '6 servings',
      nutrition: {
        calories: '300',
        protein: '15g'
      }
    }

    const mockParser = {
      extractFromUrl: vi.fn().mockResolvedValueOnce(mockExtractedRecipe)
    }
    ;(RecipeUrlParser as any).mockImplementation(() => mockParser)

    const request = new NextRequest('http://localhost:3000/api/recipes/url/extract', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/full' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe.metadata).toEqual({
      category: 'Main Course',
      cuisine: 'Italian',
      yield: '6 servings',
      nutrition: {
        calories: '300',
        protein: '15g'
      }
    })
  })
})