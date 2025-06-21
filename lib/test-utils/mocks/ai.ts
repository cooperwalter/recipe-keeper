import { vi } from 'vitest'

/**
 * Mock implementations for AI services
 */

export function createMockAnthropicClient() {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: 'Extracted Recipe',
              description: 'An AI-extracted recipe',
              ingredients: [
                { ingredient: 'Flour', amount: 2, unit: 'cups' },
              ],
              instructions: ['Mix ingredients', 'Bake'],
              prepTime: 10,
              cookTime: 30,
              servings: 4,
            }),
          },
        ],
      }),
    },
  }
}

export function setupAnthropicMock() {
  const mockClient = createMockAnthropicClient()
  
  vi.mock('@anthropic-ai/sdk', () => ({
    default: vi.fn(() => mockClient),
    Anthropic: vi.fn(() => mockClient),
  }))
  
  return mockClient
}

export function createMockOpenAIClient() {
  return {
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'This is a transcribed recipe',
        }),
      },
    },
  }
}

export function setupOpenAIMock() {
  const mockClient = createMockOpenAIClient()
  
  vi.mock('openai', () => ({
    default: vi.fn(() => mockClient),
    OpenAI: vi.fn(() => mockClient),
  }))
  
  return mockClient
}

export function createMockOCRResponse(overrides?: any) {
  return {
    title: 'OCR Recipe',
    description: 'Recipe extracted from image',
    ingredients: [
      { ingredient: 'Sugar', amount: 1, unit: 'cup' },
      { ingredient: 'Butter', amount: 0.5, unit: 'cup' },
    ],
    instructions: ['Cream butter and sugar', 'Add remaining ingredients'],
    prepTime: 15,
    cookTime: 25,
    servings: 12,
    ...overrides,
  }
}

export function createMockTranscriptionResponse(text = 'This is a test transcription') {
  return {
    text,
  }
}

export function createMockRecipeModification(overrides?: any) {
  return {
    original: {
      ingredients: [
        { ingredient: 'Flour', amount: 2, unit: 'cups' },
      ],
      instructions: ['Original instruction'],
    },
    modified: {
      ingredients: [
        { ingredient: 'Flour', amount: 3, unit: 'cups' },
      ],
      instructions: ['Modified instruction'],
    },
    changes: [
      'Increased flour from 2 to 3 cups',
      'Updated instructions',
    ],
    ...overrides,
  }
}