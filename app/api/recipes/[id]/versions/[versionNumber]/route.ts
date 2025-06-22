import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'

interface RouteParams {
  params: {
    id: string
    versionNumber: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionNumber } = params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeService = new RecipeService(supabase)
    const version = await recipeService.getRecipeVersion(id, parseInt(versionNumber))

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    return NextResponse.json(version)
  } catch (error) {
    console.error('Error fetching recipe version:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe version' },
      { status: 500 }
    )
  }
}