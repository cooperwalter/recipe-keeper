import { NextRequest, NextResponse } from 'next/server'
import { RecipeService } from '@/lib/db/recipes'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adjustments } = await request.json()
    const recipeService = new RecipeService(supabase)

    // Update only the ingredientAdjustments field
    await recipeService.updateRecipe(
      id, 
      { ingredientAdjustments: adjustments },
      false // Don't create a version for adjustment changes
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating adjustments:', error)
    return NextResponse.json(
      { error: 'Failed to update adjustments' },
      { status: 500 }
    )
  }
}