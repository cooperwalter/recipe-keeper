import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/recipes/voice/route'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      })
    }
  }))
}))

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn(() => ({
      messages: { create: mockCreate }
    })),
    __mockCreate: mockCreate
  }
})

describe('Voice Recipe API', () => {
  let mockAnthropicCreate: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const anthropicModule = await import('@anthropic-ai/sdk')
    mockAnthropicCreate = (anthropicModule as any).__mockCreate
  })

  it('should extract recipe from voice transcript', async () => {
    const mockRecipeResponse = {
      title: "Grandma's Chocolate Chip Cookies",
      description: "Classic family recipe",
      ingredients: [
        { ingredient: "flour", amount: "2 1/2", unit: "cups" },
        { ingredient: "chocolate chips", amount: "2", unit: "cups" }
      ],
      instructions: [
        "Preheat oven to 375 degrees",
        "Mix dry ingredients together"
      ],
      prepTime: 15,
      cookTime: 12,
      servings: 24,
      sourceName: "Grandma Mary",
      sourceNotes: "Always double the chocolate chips"
    }

    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify(mockRecipeResponse)
      }]
    })

    const request = new NextRequest('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: "This is my grandma's chocolate chip cookie recipe. You need two and a half cups of flour and two cups of chocolate chips. First preheat the oven to 375 degrees, then mix the dry ingredients together. It takes about 15 minutes to prep and 12 minutes to bake. Makes about 24 cookies. Grandma Mary always said to double the chocolate chips."
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe).toEqual(mockRecipeResponse)
    expect(data.transcript).toBeDefined()
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-3-haiku-20240307',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining("grandma's chocolate chip cookie")
          })
        ])
      })
    )
  })

  it('should handle missing transcript', async () => {
    const request = new NextRequest('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Transcript is required')
  })

  it('should handle unauthenticated requests', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null
        })
      }
    } as any)

    const request = new NextRequest('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'test' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle Claude API errors', async () => {
    // Reset the mock to ensure proper auth
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null
        })
      }
    } as any)
    
    mockAnthropicCreate.mockRejectedValue(new Error('API key invalid'))

    const request = new NextRequest('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'test recipe' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.error).toBe('Voice processing service not configured')
  })

  it('should handle malformed Claude responses', async () => {
    // Reset the mock to ensure proper auth
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null
        })
      }
    } as any)
    
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: 'This is not valid JSON'
      }]
    })

    const request = new NextRequest('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'test recipe' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to process voice input')
  })

  it('should handle partial recipe data', async () => {
    // Reset the mock to ensure proper auth
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null
        })
      }
    } as any)
    
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          title: "Simple Recipe",
          ingredients: [],
          instructions: ["Mix and bake"]
        })
      }]
    })

    const request = new NextRequest('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'A simple recipe: just mix and bake' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe).toMatchObject({
      title: "Simple Recipe",
      ingredients: [],
      instructions: ["Mix and bake"]
    })
    // Check that optional fields are not included when undefined
    expect(data.recipe.description).toBeUndefined()
    expect(data.recipe.prepTime).toBeUndefined()
    expect(data.recipe.cookTime).toBeUndefined()
  })
})