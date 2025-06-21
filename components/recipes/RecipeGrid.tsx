'use client'

import { RecipeWithRelations } from '@/lib/types/recipe'
import { RecipeCard } from './RecipeCard'
import { RecipeCardSkeleton } from '@/components/ui/recipe-skeletons'
import { FileX } from 'lucide-react'

interface RecipeGridProps {
  recipes: RecipeWithRelations[]
  isLoading?: boolean
  onToggleFavorite?: (recipeId: string) => Promise<void>
  emptyMessage?: string
}

export function RecipeGrid({ 
  recipes, 
  isLoading = false, 
  onToggleFavorite,
  emptyMessage = 'No recipes found'
}: RecipeGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
        {Array.from({ length: 8 }).map((_, i) => (
          <RecipeCardSkeleton 
            key={i} 
            className={i < 4 ? '' : 'animation-delay-200'}
          />
        ))}
      </div>
    )
  }

  if (recipes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] animate-fade-in">
        <div className="text-center">
          <FileX className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            {emptyMessage}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by creating your first recipe.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}