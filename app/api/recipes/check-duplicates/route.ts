import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'
import { checkForDuplicates } from '@/lib/utils/recipe-similarity'
import type { RecipeWithRelations } from '@/lib/types/recipe'

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse the recipe data to check
    const body = await request.json()
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Recipe title is required for duplicate checking' },
        { status: 400 }
      )
    }

    // Build the recipe object for comparison
    const recipeToCheck: Partial<RecipeWithRelations> = {
      title: body.title,
      description: body.description,
      prepTime: body.prepTime,
      cookTime: body.cookTime,
      servings: body.servings,
      ingredients: body.ingredients || [],
      instructions: body.instructions || [],
      tags: body.tags || [],
      categories: body.categories || [],
      photos: body.photos || [],
    }

    // Get user's existing recipes
    const recipeService = new RecipeService(supabase)
    const { recipes: existingRecipes } = await recipeService.listRecipes({
      createdBy: user.id,
      limit: 1000, // Get all recipes for comparison
    })

    // Check for duplicates
    const duplicates = checkForDuplicates(recipeToCheck, existingRecipes)

    // Return the results
    return NextResponse.json({
      duplicates: duplicates.map(match => ({
        recipe: {
          id: match.recipe.id,
          title: match.recipe.title,
          description: match.recipe.description,
          createdAt: match.recipe.createdAt,
          updatedAt: match.recipe.updatedAt,
        },
        score: match.score,
        isDuplicate: match.isDuplicate,
      })),
      totalChecked: existingRecipes.length,
    })
  } catch (error) {
    console.error('Error checking for duplicates:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    )
  }
}