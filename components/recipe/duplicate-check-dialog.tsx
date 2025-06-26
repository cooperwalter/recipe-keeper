'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useDuplicateCheck } from '@/lib/hooks/use-duplicate-check'
import { getSimilarityDescription } from '@/lib/utils/recipe-similarity'
import type { RecipeMatch } from '@/lib/utils/recipe-similarity'
import Link from 'next/link'

interface DuplicateCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipeData: {
    title: string
    description?: string
    ingredients?: Array<{
      ingredient: string
      amount?: string | number
      unit?: string
    }>
    instructions?: string[]
    prepTime?: number
    cookTime?: number
    servings?: number
  }
  onContinue: () => void
  onCancel?: () => void
}

export function DuplicateCheckDialog({
  open,
  onOpenChange,
  onContinue,
  onCancel,
}: DuplicateCheckDialogProps) {
  const duplicateCheck = useDuplicateCheck()

  // Since we're now checking beforehand, just handle open/close
  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      duplicateCheck.reset()
    }
    onOpenChange(isOpen)
  }

  const handleContinue = () => {
    onContinue()
    handleOpen(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    handleOpen(false)
  }

  const duplicates = duplicateCheck.data?.duplicates || []
  const hasDuplicates = duplicates.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Duplicate Recipe Found
          </DialogTitle>
          <DialogDescription>
            We found a recipe that appears to be very similar to the one you&apos;re creating.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <p className="text-sm">
              We found {duplicates.length} duplicate recipe{duplicates.length > 1 ? 's' : ''}:
            </p>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {duplicates.map((match) => (
                <DuplicateRecipeCard key={match.recipe.id} match={match} />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={duplicateCheck.isPending}
          >
            {hasDuplicates ? 'Continue Anyway' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DuplicateRecipeCardProps {
  match: {
    recipe: {
      id: string
      title: string
      description?: string
      createdAt: string
      updatedAt: string
    }
    score: RecipeMatch['score']
    isDuplicate: boolean
  }
}

function DuplicateRecipeCard({ match }: DuplicateRecipeCardProps) {
  const { recipe, score, isDuplicate } = match
  const similarityDesc = getSimilarityDescription(score.overall)
  const percentMatch = Math.round(score.overall * 100)

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{recipe.title}</h4>
          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {recipe.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isDuplicate ? 'destructive' : 'secondary'}
            className="whitespace-nowrap"
          >
            {percentMatch}% match
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={isDuplicate ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
          {similarityDesc}
        </span>
        <Link
          href={`/protected/recipes/${recipe.id}`}
          target="_blank"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          View recipe
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <SimilarityIndicator
          label="Title"
          value={score.titleSimilarity}
        />
        <SimilarityIndicator
          label="Ingredients"
          value={score.ingredientSimilarity}
        />
        <SimilarityIndicator
          label="Instructions"
          value={score.instructionSimilarity}
        />
      </div>
    </div>
  )
}

interface SimilarityIndicatorProps {
  label: string
  value: number
}

function SimilarityIndicator({ label, value }: SimilarityIndicatorProps) {
  const percent = Math.round(value * 100)
  const color = value >= 0.8 ? 'bg-amber-500' : value >= 0.6 ? 'bg-yellow-500' : 'bg-gray-300'

  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}