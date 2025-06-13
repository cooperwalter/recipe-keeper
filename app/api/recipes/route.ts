import { NextRequest, NextResponse } from 'next/server'
import { RecipeService } from '@/lib/supabase/recipes'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const params = {
      query: searchParams.get('query') || undefined,
      categories: searchParams.get('categories')?.split(',').filter(Boolean),
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      createdBy: searchParams.get('createdBy') || undefined,
      isPublic: searchParams.get('isPublic') === 'true' ? true : searchParams.get('isPublic') === 'false' ? false : undefined,
      isFavorite: searchParams.get('isFavorite') === 'true' ? true : searchParams.get('isFavorite') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      orderBy: searchParams.get('orderBy') as 'createdAt' | 'updatedAt' | 'title' | undefined || undefined,
      orderDirection: searchParams.get('orderDirection') as 'asc' | 'desc' | undefined || undefined,
    }

    const recipeService = new RecipeService()
    const result = await recipeService.listRecipes(params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error listing recipes:', error)
    return NextResponse.json(
      { error: 'Failed to list recipes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const recipeService = new RecipeService()
    
    // Create the recipe
    const recipe = await recipeService.createRecipe(body)

    // Add ingredients if provided
    if (body.ingredients && body.ingredients.length > 0) {
      await recipeService.addIngredients(
        body.ingredients.map((ing: { ingredient: string; amount?: string; unit?: string; orderIndex?: number; notes?: string }, index: number) => ({
          recipeId: recipe.id,
          ingredient: ing.ingredient,
          amount: ing.amount,
          unit: ing.unit,
          orderIndex: ing.orderIndex || index,
          notes: ing.notes,
        }))
      )
    }

    // Add instructions if provided
    if (body.instructions && body.instructions.length > 0) {
      await recipeService.addInstructions(
        body.instructions.map((inst: { stepNumber?: number; instruction: string }, index: number) => ({
          recipeId: recipe.id,
          stepNumber: inst.stepNumber || index + 1,
          instruction: inst.instruction,
        }))
      )
    }

    // Add categories if provided
    if (body.categoryIds && body.categoryIds.length > 0) {
      await recipeService.addCategories(recipe.id, body.categoryIds)
    }

    // Add tags if provided
    if (body.tags && body.tags.length > 0) {
      await recipeService.addTags(recipe.id, body.tags)
    }

    // Fetch the complete recipe with all relations
    const completeRecipe = await recipeService.getRecipe(recipe.id)

    return NextResponse.json(completeRecipe, { status: 201 })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}