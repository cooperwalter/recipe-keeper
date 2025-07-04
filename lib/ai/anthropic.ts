import { Anthropic } from '@anthropic-ai/sdk'

// Log API key status on initialization
const apiKey = process.env.ANTHROPIC_API_KEY || ''
if (!apiKey) {
  console.error('[Anthropic Client] WARNING: ANTHROPIC_API_KEY is not set or empty!')
} else {
  console.log('[Anthropic Client] Initialized with API key:', {
    length: apiKey.length,
    prefix: apiKey.substring(0, 10),
    suffix: '...' + apiKey.slice(-4)
  })
}

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: apiKey,
})

// Export types that might be useful
export type { Message, MessageParam } from '@anthropic-ai/sdk/resources/messages'