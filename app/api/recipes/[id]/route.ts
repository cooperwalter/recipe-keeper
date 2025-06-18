import { NextRequest, NextResponse } from 'next/server'
import { RecipeService } from '@/lib/db/recipes'
import { createClient } from '@/lib/supabase/server'
import { fractionToDecimal } from '@/lib/utils/fractions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeService = new RecipeService(supabase)
    const recipe = await recipeService.getRecipe(id)

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Add cache headers for better performance
    const response = NextResponse.json(recipe)
    
    // Cache for 60 seconds with revalidation
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
    
    return response
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const recipeService = new RecipeService(supabase)

    // Generate change summary
    let changeSummary = 'Updated recipe'
    const changes: string[] = []
    
    // Get current recipe to compare
    const currentRecipe = await recipeService.getRecipe(id)
    if (!currentRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Check for basic field changes
    if (body.title && body.title !== currentRecipe.title) {
      changes.push('title')
    }
    if (body.description !== undefined && body.description !== currentRecipe.description) {
      changes.push('description')
    }
    if (body.prepTime !== undefined && body.prepTime !== currentRecipe.prepTime) {
      changes.push('prep time')
    }
    if (body.cookTime !== undefined && body.cookTime !== currentRecipe.cookTime) {
      changes.push('cook time')
    }
    if (body.servings !== undefined && body.servings !== currentRecipe.servings) {
      changes.push('servings')
    }

    // Check for ingredient changes
    if (body.ingredients !== undefined) {
      const currentIngCount = currentRecipe.ingredients.length
      const newIngCount = body.ingredients.length
      if (newIngCount !== currentIngCount) {
        changes.push(`ingredients (${currentIngCount} → ${newIngCount})`)
      } else {
        changes.push('ingredients')
      }
    }

    // Check for instruction changes
    if (body.instructions !== undefined) {
      const currentStepCount = currentRecipe.instructions.length
      const newStepCount = body.instructions.length
      if (newStepCount !== currentStepCount) {
        changes.push(`instructions (${currentStepCount} → ${newStepCount} steps)`)
      } else {
        changes.push('instructions')
      }
    }

    // Check for tag changes
    if (body.tags !== undefined) {
      changes.push('tags')
    }

    // Create a descriptive change summary
    if (changes.length > 0) {
      changeSummary = `Updated ${changes.join(', ')}`
    }

    // Update the recipe with change summary
    await recipeService.updateRecipe(id, body, true, changeSummary)

    // Update ingredients if provided
    if (body.ingredients !== undefined) {
      await recipeService.updateIngredients(
        id,
        body.ingredients.map((ing: { ingredient: string; amount?: string; unit?: string; orderIndex?: number; notes?: string }, index: number) => ({
          recipeId: id,
          ingredient: ing.ingredient,
          amount: fractionToDecimal(ing.amount),
          unit: ing.unit,
          orderIndex: ing.orderIndex || index,
          notes: ing.notes,
        }))
      )
    }

    // Update instructions if provided
    if (body.instructions !== undefined) {
      await recipeService.updateInstructions(
        id,
        body.instructions.map((inst: { stepNumber?: number; instruction: string }, index: number) => ({
          recipeId: id,
          stepNumber: inst.stepNumber || index + 1,
          instruction: inst.instruction,
        }))
      )
    }

    // Update categories if provided
    if (body.categoryIds !== undefined) {
      await recipeService.updateCategories(id, body.categoryIds)
    }

    // Update tags if provided
    if (body.tags !== undefined) {
      await recipeService.updateTags(id, body.tags)
    }

    // Fetch the complete updated recipe
    const completeRecipe = await recipeService.getRecipe(id)

    return NextResponse.json(completeRecipe)
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeService = new RecipeService(supabase)
    await recipeService.deleteRecipe(id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    
    // Return more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete recipe'
    
    // Determine appropriate status code
    let statusCode = 500
    if (errorMessage.includes('Not authorized')) {
      statusCode = 403
    } else if (errorMessage.includes('not found')) {
      statusCode = 404
    } else if (errorMessage.includes('not authenticated')) {
      statusCode = 401
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}