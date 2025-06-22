'use client'

import { RecipeWithRelations } from '@/lib/types/recipe'
import { RecipeListItem } from './RecipeListItem'
import { RecipeListItemSkeleton } from '@/components/ui/recipe-skeletons'
import { FileX, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
      <div className="space-y-4 animate-fade-in">
        {Array.from({ length: 8 }).map((_, i) => (
          <RecipeListItemSkeleton 
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
          <Button asChild className="mt-4">
            <Link href="/protected/recipes/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Recipe
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4 animate-fade-in">
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