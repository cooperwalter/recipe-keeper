import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const v1 = searchParams.get('v1')
    const v2 = searchParams.get('v2')

    if (!v1 || !v2) {
      return NextResponse.json(
        { error: 'Version numbers v1 and v2 are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeService = new RecipeService(supabase)
    
    // Handle "current" as a special case
    const version1 = v1 === 'current' ? -1 : parseInt(v1)
    const version2 = v2 === 'current' ? -1 : parseInt(v2)
    
    const comparison = await recipeService.compareVersions(
      id,
      version1,
      version2
    )

    return NextResponse.json(comparison)
  } catch (error) {
    console.error('Error comparing recipe versions:', error)
    return NextResponse.json(
      { error: 'Failed to compare recipe versions' },
      { status: 500 }
    )
  }
}