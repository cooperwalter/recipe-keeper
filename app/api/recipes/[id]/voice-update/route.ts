import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'
import Anthropic from '@anthropic-ai/sdk'

interface RouteParams {
  params: {
    id: string
  }
}

interface RecipeChange {
  type: 'add' | 'remove' | 'modify'
  field: 'title' | 'description' | 'ingredients' | 'instructions' | 'prepTime' | 'cookTime' | 'servings' | 'sourceName' | 'sourceNotes' | 'tags' | 'categories' | 'isPublic' | 'badges'
  oldValue?: unknown
  newValue?: unknown
  details?: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transcript } = await request.json()

    console.log('Voice update request received:', { 
      recipeId: id, 
      transcriptLength: transcript?.length,
      userId: user.id,
      hasApiKey: !!process.env.ANTHROPIC_API_KEY
    })

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })
    }

    // Get the recipe to ensure user has access
    const recipeService = new RecipeService(supabase)
    const recipe = await recipeService.getRecipe(id)

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json(
        { error: 'Voice processing is not configured. Please set ANTHROPIC_API_KEY environment variable.' },
        { status: 500 }
      )
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Create a prompt to interpret the voice command
    const prompt = `You are a helpful cooking assistant. A user is speaking commands to modify their recipe. 
    
Current Recipe:
Title: ${recipe.title}
Description: ${recipe.description || 'None'}
Prep Time: ${recipe.prepTime || 'Not specified'} minutes
Cook Time: ${recipe.cookTime || 'Not specified'} minutes
Servings: ${recipe.servings || 'Not specified'}
Recipe Source: ${recipe.sourceName || 'Not specified'}
Recipe Notes: ${recipe.sourceNotes || 'None'}
Visibility: ${recipe.isPublic ? 'Public' : 'Private'}
Dietary Badges: ${recipe.badges?.join(', ') || 'None'}
Categories: ${recipe.categories?.map(c => c.name).join(', ') || 'None'}

Ingredients:
${recipe.ingredients.map((ing, i) => `${i + 1}. ${ing.amount || ''} ${ing.unit || ''} ${ing.ingredient} ${ing.notes ? `(${ing.notes})` : ''}`).join('\n')}

Instructions:
${recipe.instructions.map(inst => `${inst.stepNumber}. ${inst.instruction}`).join('\n')}

User's Voice Command: "${transcript}"

Interpret what changes the user wants to make to the recipe. Be specific about what should be added, removed, or modified.

You must respond with ONLY a valid JSON array, no other text. The format must be:
[
  {
    "type": "add" | "remove" | "modify",
    "field": "title" | "description" | "ingredients" | "instructions" | "prepTime" | "cookTime" | "servings" | "sourceName" | "sourceNotes" | "tags" | "categories" | "isPublic" | "badges",
    "oldValue": <current value if modifying or removing>,
    "newValue": <new value if adding or modifying>,
    "details": "Human-readable description of the change"
  }
]

Do not include any explanatory text before or after the JSON array.

Field mappings:
- "sourceName" = Recipe Source (who contributed the recipe)
- "sourceNotes" = Recipe Notes (family notes & memories)
- "isPublic" = Visibility (true for public, false for private)
- "badges" = Dietary badges (e.g., "vegan", "gluten-free", "keto")
- "categories" = Recipe categories (e.g., "main_dish", "dessert")

Examples:
- "Add more salt" -> modify ingredient
- "Change baking time to 30 minutes" -> modify cookTime
- "Add a note about using room temperature eggs" -> modify sourceNotes
- "Change the recipe source to Grandma Mary" -> modify sourceName
- "Make this recipe public" -> modify isPublic to true
- "Remove the vanilla extract" -> remove ingredient
- "Add step to preheat oven" -> add instruction
- "Add vegan badge" -> modify badges

Important:
- For ingredients, preserve the structure with amount, unit, and ingredient name
- For instructions, maintain step numbers
- Be conservative - only suggest changes clearly indicated by the user
- If the user's intent is unclear, ask for clarification in the details field`

    console.log('Calling Anthropic API...')
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

    console.log('Anthropic API response received:', {
      hasContent: !!response.content,
      contentLength: response.content.length
    })

    // Parse the response
    let changes: RecipeChange[] = []
    try {
      const content = response.content[0]
      if (content.type === 'text') {
        console.log('AI response text:', content.text)
        
        // Try to parse the entire response as JSON first
        try {
          changes = JSON.parse(content.text)
          console.log('Parsed changes directly:', changes)
        } catch {
          // If that fails, try to extract JSON from the response
          const jsonMatch = content.text.match(/\[[\s\S]*?\]/)
          if (jsonMatch) {
            changes = JSON.parse(jsonMatch[0])
            console.log('Parsed changes from extracted JSON:', changes)
          } else {
            console.warn('No JSON array found in AI response')
            // Return empty changes array instead of error
            changes = []
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Response text:', response.content[0])
      return NextResponse.json(
        { error: 'Failed to parse recipe changes' },
        { status: 500 }
      )
    }

    // Ensure changes is always an array
    if (!Array.isArray(changes)) {
      console.warn('Changes is not an array, defaulting to empty array')
      changes = []
    }

    // Return the interpreted changes for user review
    const responseData = {
      transcript,
      changes,
      recipe: {
        id: recipe.id,
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions
      }
    }
    
    console.log('Sending response:', { 
      transcriptLength: responseData.transcript.length,
      changesCount: responseData.changes.length 
    })
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error processing voice update:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ANTHROPIC_API_KEY') || error.message.includes('Missing ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          { error: 'Failed to process voice command' },
          { status: 500 }
        )
      }
      
      // Log the full error for debugging
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    
    return NextResponse.json(
      { error: 'Failed to process voice command' },
      { status: 500 }
    )
  }
}