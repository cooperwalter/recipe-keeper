import { NextRequest, NextResponse } from 'next/server'
import { RecipeService } from '@/lib/db/recipes'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adjustments } = await request.json()
    
    // Validate adjustments object
    if (!adjustments || typeof adjustments !== 'object') {
      return NextResponse.json({ error: 'Invalid adjustments data' }, { status: 400 })
    }
    
    // Ensure all values are numbers
    const cleanedAdjustments: Record<string, number> = {}
    for (const [key, value] of Object.entries(adjustments)) {
      if (typeof value === 'number' && !isNaN(value)) {
        cleanedAdjustments[key] = value
      }
    }
    
    console.log('Saving adjustments:', cleanedAdjustments)
    
    const recipeService = new RecipeService(supabase)

    // Update only the ingredientAdjustments field
    await recipeService.updateRecipe(
      id, 
      { ingredientAdjustments: cleanedAdjustments },
      false // Don't create a version for adjustment changes
    )

    // Return the updated recipe with all relations
    const updatedRecipe = await recipeService.getRecipe(id)
    
    if (!updatedRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    
    console.log('Updated recipe adjustments:', updatedRecipe.ingredientAdjustments)
    
    return NextResponse.json(updatedRecipe)
  } catch (error) {
    console.error('Error updating adjustments:', error)
    return NextResponse.json(
      { error: 'Failed to update adjustments' },
      { status: 500 }
    )
  }
}