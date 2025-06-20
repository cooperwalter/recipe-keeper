import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { ingredients, recipes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string; ingredientId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: recipeId, ingredientId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    console.log('Updating ingredient:', { recipeId, ingredientId, amount })

    // Update the ingredient amount
    const [updated] = await db
      .update(ingredients)
      .set({ 
        amount: amount.toString()
      })
      .where(
        and(
          eq(ingredients.id, ingredientId),
          eq(ingredients.recipeId, recipeId)
        )
      )
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    // Also update the recipe's updatedAt timestamp
    await db
      .update(recipes)
      .set({ updatedAt: new Date() })
      .where(eq(recipes.id, recipeId))

    console.log('Updated ingredient:', updated)

    return NextResponse.json({
      ...updated,
      amount: parseFloat(updated.amount || '0'),
      createdAt: updated.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error updating ingredient:', error)
    return NextResponse.json(
      { error: 'Failed to update ingredient' },
      { status: 500 }
    )
  }
}