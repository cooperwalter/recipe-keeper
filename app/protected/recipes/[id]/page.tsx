'use client'

import { useState, use, useRef, useEffect } from 'react'
import './print.css'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PhotoGallery } from '@/components/recipes/PhotoGallery'
import { VersionHistory } from '@/components/recipe/version-history'
import { RecipeScaler } from '@/components/recipe/recipe-scaler'
import { IngredientAdjuster } from '@/components/recipe/ingredient-adjuster'
import { RecipeBadges } from '@/components/recipe/recipe-badges'
import { VoiceRecipeChat } from '@/components/recipe/voice-recipe-chat'
import { RecipeDetailSkeleton } from '@/components/ui/recipe-skeletons'
import { 
  formatAmount, 
  scaleIngredientWithRules
} from '@/lib/utils/recipe-scaling'
import { getScalingRule } from '@/lib/utils/ingredient-scaling-rules'
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
import { useRecipe, useToggleFavorite, useDeleteRecipe, useUpdateIngredient, useUpdateAdjustments } from '@/lib/hooks/use-recipes'

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [recipeScale, setRecipeScale] = useState(1)

  const { data: recipe, isLoading } = useRecipe(id)
  const toggleFavorite = useToggleFavorite()
  const deleteRecipe = useDeleteRecipe()
  const updateIngredient = useUpdateIngredient()
  const updateAdjustments = useUpdateAdjustments()
  
  // Local state for optimistic favorite updates
  const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(null)
  
  // Local state for adjustments to show immediately in UI
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, number>>({})
  
  // Debounce timer refs
  const adjustmentTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  // Store adjustments in a ref to avoid closure issues
  const adjustmentsRef = useRef<Record<string, number>>({})
  
  // Initialize local adjustments from recipe data
  useEffect(() => {
    if (recipe?.ingredientAdjustments) {
      setLocalAdjustments(recipe.ingredientAdjustments)
      adjustmentsRef.current = recipe.ingredientAdjustments
    }
  }, [recipe?.ingredientAdjustments])
  
  // Cleanup timers on unmount
  useEffect(() => {
    const timersRef = adjustmentTimers.current
    return () => {
      timersRef.forEach((timer) => {
        clearTimeout(timer)
      })
      timersRef.clear()
    }
  }, [])
  

  const handleToggleFavorite = () => {
    if (recipe) {
      // Set optimistic state immediately
      setOptimisticFavorite(!displayedFavorite)
      toggleFavorite.mutate(recipe.id)
    }
  }
  
  // Determine the displayed favorite state
  const displayedFavorite = optimisticFavorite !== null ? optimisticFavorite : recipe?.isFavorite || false
  
  // Reset optimistic state when the actual data changes
  useEffect(() => {
    setOptimisticFavorite(null)
  }, [recipe?.isFavorite])

  const handlePrint = () => {
    window.print()
  }

  const handleDelete = () => {
    deleteRecipe.mutate(id, {
      onSuccess: () => {
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
        <div className="mb-4 sm:mb-6 print:hidden">
          <Link href="/protected/recipes">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Recipes
            </Button>
          </Link>
        </div>
        {/* Header */}
        <div className="mb-6 sm:mb-8 recipe-header">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{recipe.title}</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    aria-label={displayedFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    className="h-8 w-8 print:hidden [&_svg]:size-5"
                  >
                    <Heart
                      className={cn(
                        'h-5 w-5',
                        displayedFavorite && 'fill-current text-red-500'
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{displayedFavorite ? 'Remove from your favorites' : 'Add to your favorites for quick access'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 sm:flex sm:flex-nowrap gap-2 print:hidden">
              <div className="w-full sm:w-auto">
                <VoiceRecipeChat recipe={recipe} />
              </div>
              <Link href={`/protected/recipes/${recipe.id}/edit`} className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  aria-label="Edit recipe"
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint} 
                aria-label="Print recipe"
                className="w-full sm:w-auto"
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
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

          
          {recipe.badges && recipe.badges.length > 0 && (
            <div className="mt-3">
              <RecipeBadges badges={recipe.badges} size="md" />
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
            onScaleChange={setRecipeScale}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 recipe-content">
          {/* Ingredients */}
          <div className="md:col-span-1 ingredients-section">
            <h2 className="text-2xl font-semibold mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient) => {
                // Use local adjustments for immediate UI updates
                const adjustmentKey = `${ingredient.id}-${recipeScale}`
                
                // Scale the ingredient with smart rules
                const scaledIngredient = scaleIngredientWithRules(
                  ingredient, 
                  recipeScale,
                  localAdjustments // Use local state for immediate updates
                )
                
                // Check if there's a custom adjustment for this scale
                const hasCustomAdjustment = localAdjustments[adjustmentKey] !== undefined
                const displayAmount = hasCustomAdjustment 
                  ? localAdjustments[adjustmentKey] 
                  : scaledIngredient.scaledAmount || scaledIngredient.amount || 0
                // Get scaling rule for helpful notes (only show at 2x/3x)
                const scalingRule = recipeScale > 1 && scaledIngredient.isAdjustable 
                  ? getScalingRule(ingredient.ingredient)
                  : null
                
                return (
                  <li key={`${ingredient.id}-${recipeScale}`} className="flex items-start group">
                    <span className="mr-2">•</span>
                    <span className="flex-1">
                      <span className={cn(hasCustomAdjustment && "text-primary font-medium")}>
                        {displayAmount > 0 && `${formatAmount(displayAmount)} `}
                        {ingredient.unit && `${ingredient.unit} `}
                        {ingredient.ingredient}
                      </span>
                      {ingredient.notes && (
                        <span className="text-muted-foreground"> ({ingredient.notes})</span>
                      )}
                      {ingredient.amount !== null && ingredient.amount !== undefined && (
                        <IngredientAdjuster
                          ingredientName={ingredient.ingredient}
                          ingredientId={ingredient.id}
                          originalAmount={parseFloat(ingredient.amount.toString())}
                          unit={ingredient.unit}
                          scale={recipeScale}
                          currentAdjustedAmount={hasCustomAdjustment ? displayAmount : undefined}
                          scalingRule={scalingRule}
                          onAdjustment={(amount) => {
                            // Update local state immediately for instant UI feedback
                            if (amount !== undefined) {
                              if (recipeScale === 1) {
                                // At 1x scale, we don't use adjustments, but update base ingredient
                                // Still update local state for immediate feedback
                                setLocalAdjustments(prev => ({
                                  ...prev,
                                  [adjustmentKey]: amount
                                }))
                              } else {
                                // At 2x/3x scale, update local adjustments
                                setLocalAdjustments(prev => ({
                                  ...prev,
                                  [adjustmentKey]: amount
                                }))
                              }
                            } else {
                              // Reset adjustment - remove from local state
                              setLocalAdjustments(prev => {
                                const newState = { ...prev }
                                delete newState[adjustmentKey]
                                return newState
                              })
                            }
                            
                            // Clear existing timer for this adjustment
                            const existingTimer = adjustmentTimers.current.get(adjustmentKey)
                            if (existingTimer) {
                              clearTimeout(existingTimer)
                            }
                            
                            // Debounce the API call
                            const timer = setTimeout(() => {
                              if (amount !== undefined) {
                                if (recipeScale === 1) {
                                  // At 1x scale, update the base recipe
                                  updateIngredient.mutate({
                                    recipeId: id,
                                    ingredientId: ingredient.id,
                                    amount
                                  })
                                } else {
                                  // At 2x/3x scale, save permanent adjustment
                                  const newAdjustments = {
                                    ...adjustmentsRef.current,
                                    [adjustmentKey]: amount
                                  }
                                  updateAdjustments.mutate({
                                    recipeId: id,
                                    adjustments: newAdjustments
                                  })
                                  // Update ref immediately
                                  adjustmentsRef.current = newAdjustments
                                }
                              } else {
                                // Reset adjustment
                                if (recipeScale !== 1) {
                                  // At 2x/3x scale, remove the adjustment
                                  const newAdjustments = { ...adjustmentsRef.current }
                                  delete newAdjustments[adjustmentKey]
                                  updateAdjustments.mutate({
                                    recipeId: id,
                                    adjustments: newAdjustments
                                  })
                                  // Update ref immediately
                                  adjustmentsRef.current = newAdjustments
                                }
                              }
                              
                              // Clean up timer reference
                              adjustmentTimers.current.delete(adjustmentKey)
                            }, 1000) // Increased to 1s for better UX when closing widget
                            
                            adjustmentTimers.current.set(adjustmentKey, timer)
                          }}
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
          Recipe from {recipe.sourceName || 'Recipe and Me'} • {new Date(recipe.createdAt).toLocaleDateString()}
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
            disabled={deleteRecipe.isPending}
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
            <AlertDialogCancel disabled={deleteRecipe.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteRecipe.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteRecipe.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

