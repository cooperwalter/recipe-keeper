import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeService = new RecipeService(supabase)
    const { id } = await params
    
    // Verify recipe ownership
    const recipe = await recipeService.getRecipe(id)
    if (!recipe || recipe.createdBy !== user.id) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { photoUrl, caption, isOriginal } = body

    if (!photoUrl) {
      return NextResponse.json({ error: 'Photo URL is required' }, { status: 400 })
    }

    // Add photo to recipe
    const photo = await recipeService.addRecipePhoto(
      id,
      photoUrl,
      caption || undefined,
      isOriginal ?? false
    )

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Error in POST /api/recipes/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeService = new RecipeService(supabase)
    const { id } = await params
    
    // Get recipe with photos
    const recipe = await recipeService.getRecipe(id)
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json(recipe.photos || [])
  } catch (error) {
    console.error('Error in GET /api/recipes/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get photo ID from query params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
    }

    const recipeService = new RecipeService(supabase)
    // const { id } = await params // id param not needed for delete
    
    // Verify ownership and delete photo
    try {
      await recipeService.deletePhoto(photoId)
    } catch {
      return NextResponse.json({ error: 'Photo not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/recipes/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}