import { NextRequest, NextResponse } from 'next/server'
import { RecipeUrlParser } from '@/lib/services/recipe-url-parser'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from "@ai-sdk/anthropic"
import { generateObject } from "ai"
import { z } from "zod"

// Schema for parsed ingredients
const ParsedIngredientsSchema = z.object({
  ingredients: z.array(
    z.object({
      amount: z.string().optional().describe("Amount (e.g., '2', '1/2', '1.5')"),
      unit: z.string().optional().describe("Unit of measurement (e.g., 'cup', 'tbsp', 'oz')"),
      ingredient: z.string().describe("The ingredient name only, without amount or unit"),
      notes: z.string().optional().describe("Any notes or preparation instructions (e.g., 'diced', 'room temperature')"),
    })
  ).describe("List of parsed ingredients"),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get URL from request body
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Extract recipe data
    const parser = new RecipeUrlParser()
    const extractedRecipe = await parser.extractFromUrl(url)

    // Parse ingredients using AI if we have them
    let parsedIngredients = extractedRecipe.ingredients || []
    
    if (extractedRecipe.ingredients && extractedRecipe.ingredients.length > 0) {
      try {
        const { object: parsed } = await generateObject({
          model: anthropic("claude-3-5-sonnet-20241022"),
          schema: ParsedIngredientsSchema,
          prompt: `Parse the following recipe ingredients into structured format. Extract the amount, unit, ingredient name, and any preparation notes.

Important guidelines:
1. Separate the amount from the unit (e.g., "2 cups" → amount: "2", unit: "cups")
2. Keep fractions as-is (e.g., "1/2 cup" → amount: "1/2", unit: "cup")
3. Convert written numbers to digits (e.g., "one cup" → amount: "1", unit: "cup")
4. Extract preparation notes (e.g., "2 cups flour, sifted" → amount: "2", unit: "cups", ingredient: "flour", notes: "sifted")
5. The ingredient name should NOT include the amount or unit
6. Common abbreviations: tsp = teaspoon, tbsp = tablespoon, oz = ounce, lb = pound
7. If no unit is specified (e.g., "2 eggs"), leave unit empty
8. Handle ranges (e.g., "2-3 cups" → amount: "2-3", unit: "cups")

Ingredients to parse:
${extractedRecipe.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}`,
          temperature: 0.1,
          maxTokens: 2000,
        })
        
        parsedIngredients = parsed.ingredients
      } catch (parseError) {
        console.error('Failed to parse ingredients with AI:', parseError)
        // Fall back to original ingredients as strings
        parsedIngredients = extractedRecipe.ingredients
      }
    }

    // Transform to our recipe format
    const recipe = {
      title: extractedRecipe.title || '',
      description: extractedRecipe.description || '',
      ingredients: parsedIngredients,
      instructions: extractedRecipe.instructions || [],
      prepTime: extractedRecipe.prepTime,
      cookTime: extractedRecipe.cookTime,
      servings: extractedRecipe.servings,
      sourceName: extractedRecipe.sourceName,
      sourceUrl: url,
      imageUrl: extractedRecipe.image,
      // tags: extractedRecipe.keywords || [],  // Tags feature temporarily disabled
      metadata: {
        category: extractedRecipe.category,
        cuisine: extractedRecipe.cuisine,
        yield: extractedRecipe.yield,
        nutrition: extractedRecipe.nutrition
      }
    }

    return NextResponse.json({ 
      success: true, 
      recipe,
      extractedFrom: url
    })

  } catch (error) {
    console.error('Error extracting recipe from URL:', error)
    
    if (error instanceof Error) {
      // Specific error messages
      if (error.message.includes('No valid recipe data found')) {
        return NextResponse.json(
          { 
            error: 'No recipe found',
            message: 'This page does not appear to contain a recipe. Please make sure you\'re providing a direct link to a recipe page.'
          },
          { status: 422 }
        )
      }
      
      if (error.message.includes('Failed to fetch URL')) {
        return NextResponse.json(
          { 
            error: 'Could not access URL',
            message: 'Unable to access the provided URL. Please check that the link is correct and the website is accessible.'
          },
          { status: 422 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to extract recipe',
        message: 'An error occurred while extracting the recipe. Please try again or use a different URL.'
      },
      { status: 500 }
    )
  }
}