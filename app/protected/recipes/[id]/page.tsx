'use client'

import { useState, useEffect, use } from 'react'
import './print.css'
import { RecipeWithRelations } from '@/lib/types/recipe'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PhotoGallery } from '@/components/recipes/PhotoGallery'
import { 
  Clock, 
  Users, 
  Printer, 
  Heart, 
  Edit, 
  ChevronLeft,
  Calendar,
  User
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [recipe, setRecipe] = useState<RecipeWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)

  useEffect(() => {
    fetchRecipe()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/protected/recipes')
          return
        }
        throw new Error('Failed to fetch recipe')
      }
      
      const data = await response.json()
      setRecipe(data)
    } catch (error) {
      console.error('Error fetching recipe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFavorite = async () => {
    if (!recipe) return
    
    setIsFavoriteLoading(true)
    try {
      const response = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to toggle favorite')
      
      const { isFavorite } = await response.json()
      setRecipe(prev => prev ? { ...prev, isFavorite } : null)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsFavoriteLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
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
      {/* Breadcrumb Navigation */}
      <div className="container mx-auto px-4 py-4 print:hidden">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            <li>
              <Link href="/protected/recipes" className="hover:text-foreground">
                Recipes
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground font-medium">{recipe.title}</li>
          </ol>
        </nav>
      </div>

      <article className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <h1 className="text-4xl font-bold">{recipe.title}</h1>
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleFavorite}
                disabled={isFavoriteLoading}
                aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={cn(
                    'h-4 w-4',
                    recipe.isFavorite && 'fill-current text-red-500'
                  )}
                />
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrint} aria-label="Print recipe">
                <Printer className="h-4 w-4" />
              </Button>
              <Link href={`/protected/recipes/${recipe.id}/edit`}>
                <Button variant="outline" size="icon" aria-label="Edit recipe">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {recipe.description && (
            <p className="text-lg text-muted-foreground mb-4">{recipe.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
            <div className="mt-4 flex flex-wrap gap-2">
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

        {/* Family Notes */}
        {recipe.sourceNotes && (
          <div className="mb-8 p-6 bg-muted/50 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Family Notes & Memories</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{recipe.sourceNotes}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-semibold mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    {ingredient.amount && `${ingredient.amount} `}
                    {ingredient.unit && `${ingredient.unit} `}
                    {ingredient.ingredient}
                    {ingredient.notes && (
                      <span className="text-muted-foreground"> ({ingredient.notes})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction) => (
                <li key={instruction.id} className="flex">
                  <span className="mr-4 flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {instruction.stepNumber}
                  </span>
                  <p className="pt-1">{instruction.instruction}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </article>
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