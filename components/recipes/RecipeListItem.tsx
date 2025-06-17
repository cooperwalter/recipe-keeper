'use client'

import { RecipeWithRelations } from '@/lib/types/recipe'
import { Card } from '@/components/ui/card'
import { Clock, Users, Heart, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { RecipePlaceholder } from '@/components/recipe/recipe-placeholder'

interface RecipeListItemProps {
  recipe: RecipeWithRelations
  onToggleFavorite?: (recipeId: string) => Promise<void>
  className?: string
}

export function RecipeListItem({ recipe, onToggleFavorite, className }: RecipeListItemProps) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const primaryPhoto = recipe.photos.find(p => !p.isOriginal) || recipe.photos[0]

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation when clicking the heart
    if (!onToggleFavorite) return
    
    await onToggleFavorite(recipe.id)
  }

  return (
    <Link href={`/protected/recipes/${recipe.id}`}>
      <Card className={cn('hover:shadow-lg transition-shadow cursor-pointer', className)}>
        <div className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
              {primaryPhoto ? (
                <Image
                  src={primaryPhoto.photoUrl}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <RecipePlaceholder 
                  className="h-full" 
                  variant={recipe.id.charCodeAt(0) + recipe.id.charCodeAt(1)} 
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg line-clamp-1">{recipe.title}</h3>
                  {recipe.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {recipe.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>

              <div className="flex items-center justify-between mt-3">
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

                {/* Tags and Favorite */}
                <div className="flex items-center gap-2">
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{recipe.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                  
                  {onToggleFavorite && (
                    <button
                      onClick={handleToggleFavorite}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                      aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={cn(
                          'h-5 w-5 transition-all duration-200',
                          recipe.isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-muted-foreground hover:scale-110'
                        )}
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}