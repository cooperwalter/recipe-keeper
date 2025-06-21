'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { RecipeCardSkeleton, RecipeListItemSkeleton } from '@/components/ui/recipe-skeletons'
import { ContextualLoading } from '@/components/ui/loading-states'
import { Plus } from 'lucide-react'

export function RecipesPageSkeleton() {
  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <Skeleton className="h-10 w-32" />
        <div className="h-10 px-4 rounded-md bg-primary/10 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary/40" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-full sm:w-[200px] h-10" />
        <Skeleton className="w-24 h-10" />
      </div>

      {/* Loading message */}
      <div className="flex justify-center mb-8">
        <ContextualLoading context="recipes" />
      </div>

      {/* Recipe grid skeleton */}
      <RecipeGridSkeleton />
      
      {/* Pagination skeleton */}
      <div className="flex justify-center gap-2 mt-8">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>
  )
}

export function RecipeGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <RecipeCardSkeleton key={i} className="animation-delay-${i * 50}" />
      ))}
    </div>
  )
}

export function RecipeListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <RecipeListItemSkeleton key={i} className="animation-delay-${i * 50}" />
      ))}
    </div>
  )
}