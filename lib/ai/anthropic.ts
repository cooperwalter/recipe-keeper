import { Anthropic } from '@anthropic-ai/sdk'

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Export types that might be useful
export type { Message, MessageParam } from '@anthropic-ai/sdk/resources/messages'