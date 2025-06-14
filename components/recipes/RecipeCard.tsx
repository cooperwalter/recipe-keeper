'use client'

import { RecipeWithRelations } from '@/lib/types/recipe'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Users, Heart } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface RecipeCardProps {
  recipe: RecipeWithRelations
  onToggleFavorite?: (recipeId: string) => Promise<void>
  className?: string
}

export function RecipeCard({ recipe, onToggleFavorite, className }: RecipeCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const primaryPhoto = recipe.photos.find(p => !p.isOriginal) || recipe.photos[0]

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation when clicking the heart
    if (!onToggleFavorite) return
    
    setIsLoading(true)
    try {
      await onToggleFavorite(recipe.id)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Link href={`/protected/recipes/${recipe.id}`}>
      <Card className={cn('h-full hover:shadow-lg transition-shadow cursor-pointer', className)}>
        {primaryPhoto && (
          <div className="relative h-48 overflow-hidden rounded-t-lg">
            <Image
              src={primaryPhoto.photoUrl}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {onToggleFavorite && (
              <button
                onClick={handleToggleFavorite}
                disabled={isLoading}
                className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors disabled:opacity-50"
                aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={cn(
                    'h-5 w-5 transition-colors',
                    recipe.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
                  )}
                />
              </button>
            )}
          </div>
        )}
        <CardHeader className={cn(!primaryPhoto && 'pb-3')}>
          <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
          {recipe.description && (
            <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {totalTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{totalTime} min</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{recipe.servings} servings</span>
              </div>
            )}
          </div>
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">+{recipe.tags.length - 3}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}