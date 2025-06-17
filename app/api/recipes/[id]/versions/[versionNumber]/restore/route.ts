import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'

interface RouteParams {
  params: Promise<{
    id: string
    versionNumber: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionNumber } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeService = new RecipeService(supabase)
    const restoredRecipe = await recipeService.restoreVersion(id, parseInt(versionNumber))

    return NextResponse.json({
      message: `Successfully restored recipe to version ${versionNumber}`,
      recipe: restoredRecipe
    })
  } catch (error) {
    console.error('Error restoring recipe version:', error)
    return NextResponse.json(
      { error: 'Failed to restore recipe version' },
      { status: 500 }
    )
  }
}