'use client'

import { RecipeWithRelations } from '@/lib/types/recipe'
import { RecipeListItem } from './RecipeListItem'
import { Skeleton } from '@/components/ui/skeleton'
import { FileX } from 'lucide-react'

interface RecipeListProps {
  recipes: RecipeWithRelations[]
  isLoading?: boolean
  onToggleFavorite?: (recipeId: string) => Promise<void>
  emptyMessage?: string
}

export function RecipeList({ 
  recipes, 
  isLoading = false, 
  onToggleFavorite,
  emptyMessage = 'No recipes found'
}: RecipeListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <RecipeListItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (recipes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <FileX className="mx-auto h-12 w-12 text-muted-foreground" />
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
    <div className="space-y-4">
      {recipes.map((recipe) => (
        <RecipeListItem
          key={recipe.id}
          recipe={recipe}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}

function RecipeListItemSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-24 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}