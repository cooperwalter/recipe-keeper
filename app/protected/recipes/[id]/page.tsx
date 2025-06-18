'use client'

import { useState, use, useEffect, useCallback, useRef } from 'react'
import './print.css'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PhotoGallery } from '@/components/recipes/PhotoGallery'
import { VersionHistory } from '@/components/recipe/version-history'
import { RecipeScaler } from '@/components/recipe/recipe-scaler'
import { IngredientAdjuster } from '@/components/recipe/ingredient-adjuster'
import { 
  formatAmount, 
  scaleIngredientWithRules, 
  getDisplayAmount
} from '@/lib/utils/recipe-scaling'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Clock, 
  Users, 
  Printer, 
  Heart, 
  Edit, 
  ChevronLeft,
  Calendar,
  User,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRecipe, useToggleFavorite } from '@/lib/hooks/use-recipes'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recipeKeys } from '@/lib/hooks/use-recipes'
import { debounce } from '@/lib/utils/debounce'

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [recipeScale, setRecipeScale] = useState(1)
  const [scaleAdjustments, setScaleAdjustments] = useState<Record<string, Record<string, number>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const adjustmentsRef = useRef<Record<string, Record<string, number>>>({})

  const { data: recipe, isLoading } = useRecipe(id)
  const toggleFavorite = useToggleFavorite()
  
  // Load adjustments from recipe data when it arrives
  useEffect(() => {
    if (recipe?.ingredientAdjustments) {
      // Handle both old format (flat) and new format (scale-specific)
      if (typeof recipe.ingredientAdjustments === 'object' && 
          !Array.isArray(recipe.ingredientAdjustments) &&
          (recipe.ingredientAdjustments['1'] || recipe.ingredientAdjustments['2'] || recipe.ingredientAdjustments['3'])) {
        // New format: scale-specific adjustments
        setScaleAdjustments(recipe.ingredientAdjustments as Record<string, Record<string, number>>)
        adjustmentsRef.current = recipe.ingredientAdjustments as Record<string, Record<string, number>>
      } else {
        // Old format: migrate to scale-specific for scale 2
        const migrated = { '2': recipe.ingredientAdjustments as Record<string, number> }
        setScaleAdjustments(migrated)
        adjustmentsRef.current = migrated
      }
    }
  }, [recipe?.ingredientAdjustments])

  // Create debounced save function
  const saveAdjustments = useCallback(
    (recipeId: string, adjustments: Record<string, Record<string, number>>) => {
      const debouncedSave = debounce(async () => {
      setIsSaving(true)
      try {
        const response = await fetch(`/api/recipes/${recipeId}/adjustments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adjustments })
        })
        
        if (!response.ok) {
          throw new Error('Failed to save adjustments')
        }
      } catch (error) {
        console.error('Error saving adjustments:', error)
        // Could show a toast notification here
      } finally {
        setIsSaving(false)
      }
      }, 1000) // 1 second debounce
      debouncedSave()
    },
    []
  )

  // Save adjustments when they change
  useEffect(() => {
    // Only save if adjustments have actually changed from what's in the database
    if (JSON.stringify(scaleAdjustments) !== JSON.stringify(adjustmentsRef.current)) {
      saveAdjustments(id, scaleAdjustments)
    }
  }, [id, scaleAdjustments, saveAdjustments])
  
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete recipe')
      }
    },
    onSuccess: () => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      // Redirect to recipes list
      router.push('/protected/recipes')
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete recipe'
      
      // Show more helpful error messages
      if (errorMessage.includes('Not authorized')) {
        alert('You can only delete recipes that you created.')
      } else if (errorMessage.includes('not found')) {
        alert('This recipe no longer exists.')
      } else {
        alert(`Failed to delete recipe: ${errorMessage}`)
      }
    },
  })

  const handleToggleFavorite = () => {
    if (recipe) {
      toggleFavorite.mutate(recipe.id)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDelete = () => {
    deleteMutation.mutate()
    setShowDeleteConfirm(false)
  }

  if (isLoading) {
    return <RecipeDetailSkeleton />
  }

  if (!recipe) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Recipe not found</h1>
        <Link href="/protected/recipes">
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Recipes
          </Button>
        </Link>
      </div>
    )
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)

  return (
    <>
      <article className="container mx-auto pt-0 pb-8 px-4">
        {/* Back to Recipes Button */}
        <div className="mb-8 print:hidden">
          <Link href="/protected/recipes">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Recipes
            </Button>
          </Link>
        </div>
        {/* Header */}
        <div className="mb-8 recipe-header">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{recipe.title}</h1>
            <div className="flex gap-2 print:hidden flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleFavorite}
                    disabled={toggleFavorite.isPending}
                    aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart
                      className={cn(
                        'h-4 w-4 mr-1',
                        recipe.isFavorite && 'fill-current text-red-500'
                      )}
                    />
                    {recipe.isFavorite ? 'Favorited' : 'Favorite'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{recipe.isFavorite ? 'Remove from your favorites' : 'Add to your favorites for quick access'}</p>
                </TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" onClick={handlePrint} aria-label="Print recipe">
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Link href={`/protected/recipes/${recipe.id}/edit`}>
                <Button variant="outline" size="sm" aria-label="Edit recipe">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>

          {recipe.description && (
            <p className="text-lg text-muted-foreground mb-4 recipe-description">{recipe.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground recipe-meta">
            {totalTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {recipe.prepTime ? `${recipe.prepTime} min prep` : ''}
                  {recipe.prepTime && recipe.cookTime ? ' + ' : ''}
                  {recipe.cookTime ? `${recipe.cookTime} min cook` : ''}
                </span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{recipe.servings} servings</span>
              </div>
            )}
            {recipe.sourceName && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>From {recipe.sourceName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Added {new Date(recipe.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {recipe.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 recipe-tags">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recipe Photos */}
        <PhotoGallery photos={recipe.photos} recipeTitle={recipe.title} />
        
        {/* Print-only photo section */}
        {recipe.photos.length > 0 && (
          <div className="hidden recipe-photo">
            <Image 
              src={recipe.photos[0].photoUrl} 
              alt={recipe.photos[0].caption || recipe.title}
              width={600}
              height={400}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        )}

        {/* Family Notes */}
        {recipe.sourceNotes && (
          <div className="mb-8 p-6 bg-muted/50 rounded-lg family-notes">
            <h2 className="text-xl font-semibold mb-2">Family Notes & Memories</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{recipe.sourceNotes}</p>
          </div>
        )}

        {/* Recipe Scaler */}
        <div className="mb-6 print:hidden">
          <RecipeScaler 
            originalServings={recipe.servings || 4} 
            onScaleChange={(scale) => {
              setRecipeScale(scale)
              // Don't reset adjustments - they're stored per scale
            }}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 recipe-content">
          {/* Ingredients */}
          <div className="md:col-span-1 ingredients-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Ingredients</h2>
              {isSaving && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
            </div>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient) => {
                const currentScaleAdjustments = scaleAdjustments[recipeScale.toString()] || {}
                const scaledIngredient = scaleIngredientWithRules(
                  ingredient, 
                  recipeScale,
                  currentScaleAdjustments
                )
                const displayAmount = getDisplayAmount(scaledIngredient)
                
                return (
                  <li key={ingredient.id} className="flex items-start group">
                    <span className="mr-2">•</span>
                    <span className={cn(
                      "flex-1",
                      scaledIngredient.hasCustomAdjustment && recipeScale > 1 && "text-primary"
                    )}>
                      {displayAmount > 0 && `${formatAmount(displayAmount)} `}
                      {scaledIngredient.unit && `${scaledIngredient.unit} `}
                      {scaledIngredient.ingredient}
                      {scaledIngredient.notes && (
                        <span className="text-muted-foreground"> ({scaledIngredient.notes})</span>
                      )}
                      {scaledIngredient.isAdjustable && recipeScale > 1 && (
                        <IngredientAdjuster
                          ingredientName={ingredient.ingredient}
                          originalAmount={ingredient.amount || 0}
                          scaledAmount={scaledIngredient.scaledAmount || 0}
                          unit={ingredient.unit}
                          scale={recipeScale}
                          onAdjustment={(amount) => {
                            const scaleKey = recipeScale.toString()
                            if (amount === undefined) {
                              const newScaleAdjustments = { ...scaleAdjustments }
                              if (newScaleAdjustments[scaleKey]) {
                                delete newScaleAdjustments[scaleKey][ingredient.id]
                                if (Object.keys(newScaleAdjustments[scaleKey]).length === 0) {
                                  delete newScaleAdjustments[scaleKey]
                                }
                              }
                              setScaleAdjustments(newScaleAdjustments)
                            } else {
                              setScaleAdjustments({
                                ...scaleAdjustments,
                                [scaleKey]: {
                                  ...currentScaleAdjustments,
                                  [ingredient.id]: amount
                                }
                              })
                            }
                          }}
                          adjustmentReason={scaledIngredient.adjustmentReason}
                          hasCustomAdjustment={scaledIngredient.hasCustomAdjustment}
                        />
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Instructions */}
          <div className="md:col-span-2 instructions-section">
            <h2 className="text-2xl font-semibold mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction) => (
                <li key={instruction.id} className="flex">
                  <span className="mr-4 flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium step-number">
                    {instruction.stepNumber}
                  </span>
                  <p className="pt-1">{instruction.instruction}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Print-only source attribution */}
        <div className="hidden recipe-source">
          Recipe from {recipe.sourceName || 'Recipe Keeper'} • {new Date(recipe.createdAt).toLocaleDateString()}
        </div>
        
        {/* Version History */}
        <div className="mt-12 print:hidden">
          <VersionHistory recipeId={recipe.id} currentVersion={recipe.version} />
        </div>

        {/* Delete Button */}
        <div className="mt-12 print:hidden">
          <Button 
            variant="outline" 
            size="lg"
            className="w-full sm:w-[calc(100%-2rem)] mx-auto flex items-center justify-center gap-2 text-destructive border-destructive hover:bg-destructive/10 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-400/20"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-5 w-5" />
            Delete This Recipe
          </Button>
        </div>
      </article>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{recipe.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RecipeDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-10 w-3/4 mb-4" />
      <Skeleton className="h-6 w-full max-w-2xl mb-4" />
      <div className="flex gap-4 mb-8">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}