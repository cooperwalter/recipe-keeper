import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'
import Anthropic from '@anthropic-ai/sdk'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

interface RecipeChange {
  type: 'add' | 'remove' | 'modify'
  field: 'title' | 'description' | 'ingredients' | 'instructions' | 'prepTime' | 'cookTime' | 'servings' | 'notes' | 'tags'
  oldValue?: any
  newValue?: any
  details?: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transcript, currentRecipe } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })
    }

    // Get the recipe to ensure user has access
    const recipeService = new RecipeService(supabase)
    const recipe = await recipeService.getRecipe(id)

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    // Create a prompt to interpret the voice command
    const prompt = `You are a helpful cooking assistant. A user is speaking commands to modify their recipe. 
    
Current Recipe:
Title: ${recipe.title}
Description: ${recipe.description || 'None'}
Prep Time: ${recipe.prepTime || 'Not specified'} minutes
Cook Time: ${recipe.cookTime || 'Not specified'} minutes
Servings: ${recipe.servings || 'Not specified'}

Ingredients:
${recipe.ingredients.map((ing, i) => `${i + 1}. ${ing.amount || ''} ${ing.unit || ''} ${ing.ingredient} ${ing.notes ? `(${ing.notes})` : ''}`).join('\n')}

Instructions:
${recipe.instructions.map(inst => `${inst.stepNumber}. ${inst.instruction}`).join('\n')}

Tags: ${recipe.tags.join(', ') || 'None'}
Notes: ${recipe.sourceNotes || 'None'}

User's Voice Command: "${transcript}"

Interpret what changes the user wants to make to the recipe. Be specific about what should be added, removed, or modified.

Respond with a JSON array of changes in this format:
[
  {
    "type": "add" | "remove" | "modify",
    "field": "title" | "description" | "ingredients" | "instructions" | "prepTime" | "cookTime" | "servings" | "notes" | "tags",
    "oldValue": <current value if modifying or removing>,
    "newValue": <new value if adding or modifying>,
    "details": "Human-readable description of the change"
  }
]

Examples:
- "Add more salt" -> modify ingredient
- "Change baking time to 30 minutes" -> modify cookTime
- "Add a note about using room temperature eggs" -> modify notes
- "Remove the vanilla extract" -> remove ingredient
- "Add step to preheat oven" -> add instruction

Important:
- For ingredients, preserve the structure with amount, unit, and ingredient name
- For instructions, maintain step numbers
- Be conservative - only suggest changes clearly indicated by the user
- If the user's intent is unclear, ask for clarification in the details field`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Parse the response
    let changes: RecipeChange[] = []
    try {
      const content = response.content[0]
      if (content.type === 'text') {
        // Extract JSON from the response
        const jsonMatch = content.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          changes = JSON.parse(jsonMatch[0])
        }
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse recipe changes' },
        { status: 500 }
      )
    }

    // Return the interpreted changes for user review
    return NextResponse.json({
      transcript,
      changes,
      recipe: {
        id: recipe.id,
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions
      }
    })
  } catch (error) {
    console.error('Error processing voice update:', error)
    return NextResponse.json(
      { error: 'Failed to process voice command' },
      { status: 500 }
    )
  }
}