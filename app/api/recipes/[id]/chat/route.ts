import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/ai/anthropic'
import { RecipeWithRelations } from '@/lib/types/recipe'

interface ChatRequest {
  question: string
  recipe: RecipeWithRelations
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { question, recipe, conversationHistory = [] }: ChatRequest = await request.json()

    if (!question || !recipe) {
      return NextResponse.json(
        { error: 'Question and recipe are required' },
        { status: 400 }
      )
    }

    // Verify recipe ID matches
    if (recipe.id !== id) {
      return NextResponse.json(
        { error: 'Recipe ID mismatch' },
        { status: 400 }
      )
    }

    // Build context for the AI
    const recipeContext = `
Recipe: ${recipe.title}
${recipe.description ? `Description: ${recipe.description}` : ''}
${recipe.prepTime ? `Prep Time: ${recipe.prepTime} minutes` : ''}
${recipe.cookTime ? `Cook Time: ${recipe.cookTime} minutes` : ''}
${recipe.servings ? `Servings: ${recipe.servings}` : ''}
${recipe.sourceName ? `Source: ${recipe.sourceName}` : ''}

Ingredients:
${recipe.ingredients.map((ing, idx) => 
  `${idx + 1}. ${ing.amount ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.ingredient}${ing.notes ? ' (' + ing.notes + ')' : ''}`
).join('\n')}

Instructions:
${recipe.instructions.map((inst) => 
  `${inst.stepNumber}. ${inst.instruction}`
).join('\n')}

${recipe.sourceNotes ? `Family Notes: ${recipe.sourceNotes}` : ''}
${recipe.tags.length > 0 ? `Tags: ${recipe.tags.join(', ')}` : ''}
`

    // Build system prompt
    const systemPrompt = `You are a helpful cooking assistant with deep knowledge about recipes and cooking techniques. You have access to the complete details of a specific recipe and can answer questions about it.

Your responses should be:
- Helpful and specific to the recipe
- Clear and easy to understand
- Based on the recipe details provided
- Practical and actionable
- Friendly and encouraging

You can help with:
- Ingredient substitutions
- Cooking techniques and explanations
- Timing and preparation questions
- Dietary modifications
- Storage and make-ahead tips
- Troubleshooting cooking issues
- General cooking advice related to the recipe

Here is the recipe you're helping with:

${recipeContext}`

    // Build conversation messages (without system role)
    const messages = [
      // Include conversation history
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      // Add current question
      {
        role: 'user' as const,
        content: question
      }
    ]

    // Get response from Claude
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages,
      temperature: 0.7
    })

    const response = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : 'I apologize, but I was unable to generate a response. Please try again.'

    return NextResponse.json({ response })

  } catch (error) {
    console.error('Recipe chat error:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process your question. Please try again.' },
      { status: 500 }
    )
  }
}