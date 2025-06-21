import { useMutation } from '@tanstack/react-query'
import type { RecipeMatch } from '@/lib/utils/recipe-similarity'
import type { RecipeWithRelations } from '@/lib/types/recipe'

interface DuplicateCheckResponse {
  duplicates: Array<{
    recipe: Pick<RecipeWithRelations, 'id' | 'title' | 'description' | 'createdAt' | 'updatedAt'>
    score: RecipeMatch['score']
    isDuplicate: boolean
  }>
  totalChecked: number
}

interface DuplicateCheckRequest {
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
  tags?: string[]
}

/**
 * Hook to check for duplicate recipes
 */
export function useDuplicateCheck() {
  return useMutation<DuplicateCheckResponse, Error, DuplicateCheckRequest>({
    mutationFn: async (recipeData) => {
      const response = await fetch('/api/recipes/check-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to check for duplicates')
      }

      return response.json()
    },
  })
}