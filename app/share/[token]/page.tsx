'use client'

import { useState, useEffect, use } from 'react'
import { Button } from '@/components/ui/button'
import { PhotoGallery } from '@/components/recipes/PhotoGallery'
import { RecipeScaler } from '@/components/recipe/recipe-scaler'
import { RecipeBadges } from '@/components/recipe/recipe-badges'
import { RecipeDetailSkeleton } from '@/components/ui/recipe-skeletons'
import { 
  formatAmount, 
  scaleIngredientWithRules
} from '@/lib/utils/recipe-scaling'
import { 
  Clock, 
  Users, 
  Printer,
  User
} from 'lucide-react'
import Link from 'next/link'

interface SharePageProps {
  params: Promise<{ token: string }>
}

interface SharedRecipe {
  recipe: {
    id: string
    title: string
    description?: string
    prepTime?: number
    cookTime?: number
    servings?: number
    sourceName?: string
    sourceNotes?: string
    badges?: string[]
    ingredients: Array<{
      id: string
      ingredient: string
      amount?: string
      unit?: string
      notes?: string
      orderIndex: number
    }>
    instructions: Array<{
      id: string
      stepNumber: number
      instruction: string
    }>
    photos: Array<{
      id: string
      photoUrl: string
      caption?: string
      isOriginal?: boolean
    }>
    createdAt: string
    updatedAt: string
  }
  sharedBy: string
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params)
  const [recipe, setRecipe] = useState<SharedRecipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recipeScale, setRecipeScale] = useState(1)

  useEffect(() => {
    const fetchSharedRecipe = async () => {
      try {
        const response = await fetch(`/api/share/${token}`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to fetch recipe')
        }
        const data = await response.json()
        setRecipe(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe')
      } finally {
        setLoading(false)
      }
    }

    fetchSharedRecipe()
  }, [token])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Recipe Keeper</h1>
            <Button disabled>Create Your Own Cookbook</Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <RecipeDetailSkeleton />
        </main>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Recipe Not Found</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'This recipe share link may be invalid or expired.'}
          </p>
          <Link href="/">
            <Button variant="outline">Go to Homepage</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { recipe: recipeData } = recipe
  const totalTime = (recipeData.prepTime || 0) + (recipeData.cookTime || 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Recipe Keeper</h1>
          <Link href="/auth/signup">
            <Button>Create Your Own Cookbook</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">{recipeData.title}</h1>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrint}
              className="print:hidden"
              title="Print recipe"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>

          {recipeData.description && (
            <p className="text-lg text-muted-foreground mb-4">{recipeData.description}</p>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Shared with you by <strong>{recipe.sharedBy}</strong></span>
            </p>
          </div>

          {recipeData.badges && recipeData.badges.length > 0 && (
            <div className="mb-4">
              <RecipeBadges badges={recipeData.badges} />
            </div>
          )}

          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-6">
            {recipeData.prepTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Prep: {recipeData.prepTime} min</span>
              </div>
            )}
            {recipeData.cookTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Cook: {recipeData.cookTime} min</span>
              </div>
            )}
            {totalTime > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Total: {totalTime} min</span>
              </div>
            )}
            {recipeData.servings && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Servings: {recipeData.servings}</span>
              </div>
            )}
          </div>

          {(recipeData.sourceName || recipeData.sourceNotes) && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              {recipeData.sourceName && (
                <p className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Recipe from:</span> {recipeData.sourceName}
                </p>
              )}
              {recipeData.sourceNotes && (
                <p className="text-sm mt-2 italic">{recipeData.sourceNotes}</p>
              )}
            </div>
          )}

          {recipeData.photos.length > 0 && (
            <div className="mb-8">
              <PhotoGallery photos={recipeData.photos} readOnly />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="mb-4 print:hidden">
              <RecipeScaler
                originalServings={recipeData.servings || 4}
                onScaleChange={setRecipeScale}
              />
            </div>

            <h2 className="text-2xl font-semibold mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipeData.ingredients.map((ingredient) => {
                // Convert amount from string to number if it exists
                const ingredientWithNumericAmount = {
                  ...ingredient,
                  amount: ingredient.amount ? parseFloat(ingredient.amount) : undefined
                }
                
                // Scale the ingredient if it has an amount
                const scaledIngredient = scaleIngredientWithRules(
                  ingredientWithNumericAmount,
                  recipeScale
                )
                
                const displayAmount = scaledIngredient.scaledAmount || scaledIngredient.amount || 0

                return (
                  <li key={ingredient.id} className="flex gap-2">
                    {displayAmount > 0 && (
                      <>
                        <span className="font-medium">
                          {formatAmount(displayAmount)}
                        </span>
                        {ingredient.unit && (
                          <span className="font-medium">
                            {ingredient.unit}
                          </span>
                        )}
                      </>
                    )}
                    <span>{ingredient.ingredient}</span>
                    {ingredient.notes && (
                      <span className="text-muted-foreground">({ingredient.notes})</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipeData.instructions.map((instruction) => (
                <li key={instruction.id} className="flex gap-3">
                  <span className="font-semibold text-primary flex-shrink-0">
                    {instruction.stepNumber}.
                  </span>
                  <span>{instruction.instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Shared from Recipe Keeper •{' '}
            <Link href="/" className="text-primary hover:underline">
              Create your own digital cookbook
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}