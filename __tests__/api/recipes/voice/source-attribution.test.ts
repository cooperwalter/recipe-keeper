import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('Voice Recipe API - Source Attribution', () => {
  let mockAnthropicCreate: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const anthropicModule = await import('@anthropic-ai/sdk')
    mockAnthropicCreate = (anthropicModule as any).__mockCreate
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
  })

  it('should extract recipe source from "this recipe is from Grandma"', async () => {
    // Mock Claude response with source attribution
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          title: "Chocolate Chip Cookies",
          ingredients: [
            { ingredient: "flour", amount: "2", unit: "cups" }
          ],
          instructions: ["Mix ingredients", "Bake at 350°F"],
          sourceName: "Grandma"
        })
      }]
    })

    const request = new Request('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: "This recipe is from Grandma. Chocolate chip cookies..."
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe.sourceName).toBe("Grandma")
    expect(data.recipe.title).toBe("Chocolate Chip Cookies")
  })

  it('should extract recipe source from various attribution phrases', async () => {
    const testCases = [
      { phrase: "This is my mother's apple pie recipe", expectedSource: "Mother" },
      { phrase: "I got this recipe from Aunt Sally", expectedSource: "Aunt Sally" },
      { phrase: "Recipe from my neighbor Bob", expectedSource: "Neighbor Bob" },
      { phrase: "This was Dad's famous chili", expectedSource: "Dad" },
      { phrase: "From Nana's kitchen", expectedSource: "Nana" }
    ]

    for (const testCase of testCases) {
      vi.clearAllMocks()
      
      // Mock Claude response with appropriate source
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            title: "Test Recipe",
            ingredients: [],
            instructions: ["Test step"],
            sourceName: testCase.expectedSource
          })
        }]
      })

      const request = new Request('http://localhost:3000/api/recipes/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: testCase.phrase + ". Here's how to make it..."
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recipe.sourceName).toBe(testCase.expectedSource)
    }
  })

  it('should not put source attribution in description field', async () => {
    // Mock Claude response - ensure source is in sourceName, not description
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          title: "Apple Pie",
          description: "A delicious homemade apple pie",
          ingredients: [
            { ingredient: "apples", amount: "6", unit: "" }
          ],
          instructions: ["Peel apples", "Make crust"],
          sourceName: "Grandma Mary"
        })
      }]
    })

    const request = new Request('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: "This recipe is from Grandma Mary. It's an apple pie..."
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe.sourceName).toBe("Grandma Mary")
    expect(data.recipe.description).toBe("A delicious homemade apple pie")
    expect(data.recipe.description).not.toContain("Grandma Mary")
    expect(data.recipe.description).not.toContain("This recipe is from")
  })

  it('should handle sourceNotes separately from sourceName', async () => {
    // Mock Claude response with both sourceName and sourceNotes
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          title: "Holiday Cookies",
          ingredients: [],
          instructions: ["Mix", "Bake"],
          sourceName: "Aunt Betty",
          sourceNotes: "She always made these for Christmas"
        })
      }]
    })

    const request = new Request('http://localhost:3000/api/recipes/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: "This recipe is from Aunt Betty. She always made these for Christmas..."
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe.sourceName).toBe("Aunt Betty")
    expect(data.recipe.sourceNotes).toBe("She always made these for Christmas")
  })
})