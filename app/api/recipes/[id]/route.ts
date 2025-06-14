import { NextRequest, NextResponse } from 'next/server'
import { RecipeService } from '@/lib/supabase/recipes'
import { createClient } from '@/lib/supabase/server'

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

    return NextResponse.json(recipe)
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

    // Update the recipe
    await recipeService.updateRecipe({ id, ...body })

    // Update ingredients if provided
    if (body.ingredients !== undefined) {
      await recipeService.updateIngredients(
        id,
        body.ingredients.map((ing: { ingredient: string; amount?: string; unit?: string; orderIndex?: number; notes?: string }, index: number) => ({
          recipeId: id,
          ingredient: ing.ingredient,
          amount: ing.amount,
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
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}