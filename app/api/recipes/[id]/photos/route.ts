import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify recipe ownership
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', params.id)
      .eq('userId', user.id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { photoUrl, caption, isOriginal } = body

    if (!photoUrl) {
      return NextResponse.json({ error: 'Photo URL is required' }, { status: 400 })
    }

    // Create photo record
    const { data: photo, error: photoError } = await supabase
      .from('recipe_photos')
      .insert({
        recipeId: params.id,
        photoUrl,
        caption: caption || null,
        isOriginal: isOriginal ?? false,
      })
      .select()
      .single()

    if (photoError) {
      console.error('Error creating photo record:', photoError)
      return NextResponse.json({ error: 'Failed to create photo' }, { status: 500 })
    }

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Error in POST /api/recipes/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get photos for recipe
    const { data: photos, error } = await supabase
      .from('recipe_photos')
      .select('*')
      .eq('recipeId', params.id)
      .order('createdAt', { ascending: true })

    if (error) {
      console.error('Error fetching photos:', error)
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    return NextResponse.json(photos || [])
  } catch (error) {
    console.error('Error in GET /api/recipes/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })
    
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

    // Verify ownership through recipe
    const { data: photo, error: photoError } = await supabase
      .from('recipe_photos')
      .select('*, recipes!inner(userId)')
      .eq('id', photoId)
      .eq('recipeId', params.id)
      .single()

    if (photoError || !photo || photo.recipes.userId !== user.id) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Delete photo record (storage file will be handled separately if needed)
    const { error: deleteError } = await supabase
      .from('recipe_photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('Error deleting photo:', deleteError)
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/recipes/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}