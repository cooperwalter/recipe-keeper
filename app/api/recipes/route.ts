import { NextRequest, NextResponse } from 'next/server'
import { RecipeService } from '@/lib/db/recipes'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const params = {
      query: searchParams.get('query') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      userId: searchParams.get('userId') || undefined,
      isPublic: searchParams.get('isPublic') === 'true' ? true : searchParams.get('isPublic') === 'false' ? false : undefined,
      isFavorite: searchParams.get('isFavorite') === 'true' ? true : searchParams.get('isFavorite') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      orderBy: searchParams.get('orderBy') as 'createdAt' | 'title' | 'prepTime' | undefined || undefined,
      orderDirection: searchParams.get('orderDirection') as 'asc' | 'desc' | undefined || undefined,
    }

    // If requesting user's own recipes or favorites, require authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if ((params.userId || params.isFavorite !== undefined) && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeService = new RecipeService(supabase)
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
    const recipeService = new RecipeService(supabase)
    
    // Create the recipe
    const recipe = await recipeService.createRecipe({
      title: body.title,
      description: body.description,
      ingredients: body.ingredients || [],
      instructions: body.instructions || [],
      prepTime: body.prepTime,
      cookTime: body.cookTime,
      servings: body.servings,
      difficulty: body.difficulty,
      categoryId: body.categoryId,
      source: body.source,
      sourceUrl: body.sourceUrl,
      nutritionInfo: body.nutritionInfo,
      tags: body.tags || [],
      isPublic: body.isPublic || false,
      notes: body.notes,
    })

    // Add photo if provided
    if (body.photoUrl) {
      await recipeService.addPhoto(recipe.id, body.photoUrl, body.photoCaption, true)
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