/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'
import Anthropic from '@anthropic-ai/sdk'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/db/recipes', () => ({
  RecipeService: vi.fn()
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}))

const mockRecipe = {
  id: 'test-recipe-id',
  title: 'Chocolate Chip Cookies',
  description: 'Delicious homemade cookies',
  prepTime: 15,
  cookTime: 12,
  servings: 24,
  sourceName: 'Grandma',
  sourceNotes: 'Family recipe',
  ingredients: [
    { id: '1', ingredient: 'flour', amount: '2', unit: 'cups', notes: null, orderIndex: 0 },
    { id: '2', ingredient: 'sugar', amount: '1', unit: 'cup', notes: null, orderIndex: 1 },
    { id: '3', ingredient: 'eggs', amount: '2', unit: null, notes: null, orderIndex: 2 }
  ],
  instructions: [
    { id: '1', stepNumber: 1, instruction: 'Preheat oven to 350°F' },
    { id: '2', stepNumber: 2, instruction: 'Mix dry ingredients' },
    { id: '3', stepNumber: 3, instruction: 'Add wet ingredients' }
  ],
  tags: ['dessert', 'cookies'],
  photos: [],
  categories: [],
  isFavorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'test-user-id'
}

describe('POST /api/recipes/[id]/voice-update', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn()
    }
  }

  const mockRecipeService = {
    getRecipe: vi.fn()
  }

  const mockAnthropicClient = {
    messages: {
      create: vi.fn()
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
    ;(RecipeService as any).mockImplementation(() => mockRecipeService)
    ;(Anthropic as any).mockReturnValue(mockAnthropicClient)
  })

  const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest('http://localhost/api/recipes/test-recipe-id/voice-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  }

  it('returns 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const request = createRequest({ transcript: 'Add more flour' })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 if no transcript is provided', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })

    const request = createRequest({})
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No transcript provided')
  })

  it('returns 404 if recipe is not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(null)

    const request = createRequest({ transcript: 'Add more flour' })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Recipe not found')
  })

  it('successfully processes voice command for ingredient change', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)
    
    const mockChanges = [
      {
        type: 'modify',
        field: 'ingredients',
        oldValue: { ingredient: 'flour', amount: '2', unit: 'cups' },
        newValue: { ingredient: 'flour', amount: '2.5', unit: 'cups' },
        details: 'Increasing flour amount for thicker consistency'
      }
    ]
    
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockChanges) }]
    })

    const request = createRequest({ 
      transcript: 'Add half a cup more flour',
      currentRecipe: mockRecipe 
    })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.transcript).toBe('Add half a cup more flour')
    expect(data.changes).toEqual(mockChanges)
    expect(data.recipe).toEqual({
      id: mockRecipe.id,
      title: mockRecipe.title,
      ingredients: mockRecipe.ingredients,
      instructions: mockRecipe.instructions
    })
  })

  it('processes multiple changes from voice command', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)
    
    const mockChanges = [
      {
        type: 'modify',
        field: 'cookTime',
        oldValue: 12,
        newValue: 15,
        details: 'Increasing baking time'
      },
      {
        type: 'add',
        field: 'ingredients',
        newValue: { ingredient: 'vanilla extract', amount: '1', unit: 'tsp' },
        details: 'Adding vanilla for flavor'
      }
    ]
    
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockChanges) }]
    })

    const request = createRequest({ 
      transcript: 'Bake for 3 more minutes and add a teaspoon of vanilla',
      currentRecipe: mockRecipe 
    })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.changes).toHaveLength(2)
    expect(data.changes[0].field).toBe('cookTime')
    expect(data.changes[1].field).toBe('ingredients')
  })

  it('handles instruction modifications', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)
    
    const mockChanges = [
      {
        type: 'modify',
        field: 'instructions',
        oldValue: { stepNumber: 1, instruction: 'Preheat oven to 350°F' },
        newValue: { stepNumber: 1, instruction: 'Preheat oven to 375°F' },
        details: 'Increasing oven temperature'
      }
    ]
    
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockChanges) }]
    })

    const request = createRequest({ 
      transcript: 'Change the oven temperature to 375 degrees',
      currentRecipe: mockRecipe 
    })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.changes[0].newValue.instruction).toContain('375°F')
  })

  it('handles adding notes to recipe', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)
    
    const mockChanges = [
      {
        type: 'modify',
        field: 'notes',
        oldValue: 'Family recipe',
        newValue: 'Family recipe. Works best with room temperature eggs.',
        details: 'Adding tip about egg temperature'
      }
    ]
    
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockChanges) }]
    })

    const request = createRequest({ 
      transcript: 'Add a note that this works best with room temperature eggs',
      currentRecipe: mockRecipe 
    })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.changes[0].field).toBe('notes')
    expect(data.changes[0].newValue).toContain('room temperature eggs')
  })

  it('handles removing ingredients', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)
    
    const mockChanges = [
      {
        type: 'remove',
        field: 'ingredients',
        oldValue: { ingredient: 'sugar', amount: '1', unit: 'cup' },
        details: 'Removing sugar from recipe'
      }
    ]
    
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockChanges) }]
    })

    const request = createRequest({ 
      transcript: 'Remove the sugar',
      currentRecipe: mockRecipe 
    })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.changes[0].type).toBe('remove')
    expect(data.changes[0].oldValue.ingredient).toBe('sugar')
  })

  it('handles empty or unclear commands', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)
    
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: '[]' }]
    })

    const request = createRequest({ 
      transcript: 'Um, I think maybe...',
      currentRecipe: mockRecipe 
    })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.changes).toEqual([])
  })

  it('handles AI service errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)
    
    mockAnthropicClient.messages.create.mockRejectedValue(new Error('AI service error'))

    const request = createRequest({ 
      transcript: 'Add more flour',
      currentRecipe: mockRecipe 
    })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to process voice command')
  })

  it('handles malformed AI responses', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)
    
    // When AI returns text with no JSON array, it returns empty changes
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Not valid JSON' }]
    })

    const request = createRequest({ 
      transcript: 'Add more flour',
      currentRecipe: mockRecipe 
    })
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.changes).toEqual([])
    
    // Test with invalid JSON in array format
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: '[{invalid json}]' }]
    })
    
    const request2 = createRequest({ 
      transcript: 'Add more flour',
      currentRecipe: mockRecipe 
    })
    const response2 = await POST(request2, { params: { id: 'test-recipe-id' } })
    const data2 = await response2.json()
    
    expect(response2.status).toBe(500)
    expect(data2.error).toBe('Failed to parse recipe changes')
  })

  it('validates Anthropic API key is present', async () => {
    // The Anthropic constructor will throw if no API key is present
    ;(Anthropic as any).mockImplementationOnce(() => {
      throw new Error('Missing ANTHROPIC_API_KEY')
    })

    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })
    mockRecipeService.getRecipe.mockResolvedValue(mockRecipe)

    const request = createRequest({ 
      transcript: 'Add more flour',
      currentRecipe: mockRecipe 
    })
    
    const response = await POST(request, { params: { id: 'test-recipe-id' } })
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to process voice command')
  })
})