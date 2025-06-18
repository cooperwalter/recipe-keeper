import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RecipeListResponse, RecipeCategory, RecipeWithRelations } from '@/lib/types/recipe'

const ITEMS_PER_PAGE = 12

interface RecipeFilters {
  query?: string
  categoryId?: string
  page?: number
}

// Query keys factory
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: RecipeFilters) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  categories: ['categories'] as const,
} as const

// Fetch recipes with filters
async function fetchRecipes(filters: RecipeFilters): Promise<RecipeListResponse> {
  const params = new URLSearchParams()
  
  if (filters.query) params.append('query', filters.query)
  if (filters.categoryId && filters.categoryId !== 'all') {
    params.append('categoryId', filters.categoryId)
  }
  params.append('limit', ITEMS_PER_PAGE.toString())
  params.append('offset', (((filters.page || 1) - 1) * ITEMS_PER_PAGE).toString())

  const response = await fetch(`/api/recipes?${params}`)
  if (!response.ok) throw new Error('Failed to fetch recipes')
  
  return response.json()
}

// Fetch categories
async function fetchCategories(): Promise<RecipeCategory[]> {
  const response = await fetch('/api/categories')
  if (!response.ok) throw new Error('Failed to fetch categories')
  
  return response.json()
}

// Fetch single recipe
async function fetchRecipe(id: string): Promise<RecipeWithRelations> {
  const response = await fetch(`/api/recipes/${id}`)
  if (!response.ok) throw new Error('Failed to fetch recipe')
  
  return response.json()
}

// Hook to fetch recipes list
export function useRecipes(filters: RecipeFilters) {
  return useQuery({
    queryKey: recipeKeys.list(filters),
    queryFn: () => fetchRecipes(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  })
}

// Hook to fetch categories
export function useCategories() {
  return useQuery({
    queryKey: recipeKeys.categories,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // Categories don't change often
  })
}

// Hook to fetch single recipe
export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => fetchRecipe(id),
    enabled: !!id,
  })
}

// Hook to toggle favorite
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to toggle favorite')
      return response.json()
    },
    onMutate: async (recipeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: recipeKeys.lists() })
      await queryClient.cancelQueries({ queryKey: recipeKeys.detail(recipeId) })

      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: recipeKeys.lists() })
      const previousDetail = queryClient.getQueryData(recipeKeys.detail(recipeId))

      // Optimistically update all recipe lists
      queryClient.setQueriesData({ queryKey: recipeKeys.lists() }, (old: RecipeListResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          recipes: old.recipes.map((recipe) =>
            recipe.id === recipeId ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe
          ),
        }
      })

      // Optimistically update the detail view
      queryClient.setQueryData(recipeKeys.detail(recipeId), (old: RecipeWithRelations | undefined) => {
        if (!old) return old
        return { ...old, isFavorite: !old.isFavorite }
      })

      // Return a context with the snapshots
      return { previousLists, previousDetail }
    },
    onError: (err, recipeId, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(recipeKeys.detail(recipeId), context.previousDetail)
      }
    },
    onSettled: (data, error, recipeId) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) })
    },
  })
}

// Prefetch a recipe (useful for hover or when we anticipate navigation)
export function usePrefetchRecipe() {
  const queryClient = useQueryClient()
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: recipeKeys.detail(id),
      queryFn: () => fetchRecipe(id),
      staleTime: 10 * 1000, // Only prefetch if data is older than 10 seconds
    })
  }
}

// Hook to delete a recipe with optimistic updates
export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete recipe')
      }
    },
    onMutate: async (recipeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: recipeKeys.lists() })

      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: recipeKeys.lists() })

      // Optimistically remove the recipe from all lists
      queryClient.setQueriesData({ queryKey: recipeKeys.lists() }, (old: RecipeListResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          recipes: old.recipes.filter((recipe) => recipe.id !== recipeId),
          total: old.total - 1,
        }
      })

      // Return a context with the snapshots
      return { previousLists }
    },
    onError: (err, recipeId, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
    },
  })
}

// Hook to update a recipe with optimistic updates
export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        body: data,
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update recipe')
      }
      
      return response.json()
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: recipeKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: recipeKeys.lists() })

      // Extract basic recipe data from FormData
      const title = data.get('title') as string
      const description = data.get('description') as string
      const servings = parseInt(data.get('servings') as string || '4')

      // Snapshot the previous values
      const previousDetail = queryClient.getQueryData(recipeKeys.detail(id))
      const previousLists = queryClient.getQueriesData({ queryKey: recipeKeys.lists() })

      // Optimistically update the detail view
      queryClient.setQueryData(recipeKeys.detail(id), (old: RecipeWithRelations | undefined) => {
        if (!old) return old
        return {
          ...old,
          title,
          description,
          servings,
          updatedAt: new Date().toISOString(),
        }
      })

      // Optimistically update all recipe lists
      queryClient.setQueriesData({ queryKey: recipeKeys.lists() }, (old: RecipeListResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          recipes: old.recipes.map((recipe) =>
            recipe.id === id 
              ? { ...recipe, title, description, updatedAt: new Date().toISOString() }
              : recipe
          ),
        }
      })

      // Return a context with the snapshots
      return { previousDetail, previousLists }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousDetail) {
        queryClient.setQueryData(recipeKeys.detail(variables.id), context.previousDetail)
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (data, variables) => {
      // Update with the actual server data
      queryClient.setQueryData(recipeKeys.detail(variables.id), data)
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
    },
  })
}