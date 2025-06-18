import { createClient } from '@/lib/supabase/server'
import { RecipeService } from '@/lib/db/recipes'
import { CategoryService } from '@/lib/db/categories'
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { recipeKeys } from '@/lib/hooks/use-recipes'
import RecipesPageContent from './recipes-client'

interface RecipesServerProps {
  searchParams: Promise<{
    q?: string
    category?: string
    page?: string
    view?: string
  }>
}

export default async function RecipesServer({ searchParams }: RecipesServerProps) {
  const params = await searchParams
  const supabase = await createClient()
  const recipeService = new RecipeService(supabase)
  
  // Create a new QueryClient for each request
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  })

  const page = parseInt(params.page || '1', 10)
  const query = params.q || ''
  const categoryId = params.category || 'all'

  // Pre-fetch recipes data on the server
  await queryClient.prefetchQuery({
    queryKey: recipeKeys.list({ query, categoryId, page }),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const recipes = await recipeService.listRecipes({
        query,
        categoryId: categoryId === 'all' ? undefined : categoryId,
        limit: 12,
        offset: (page - 1) * 12,
        createdBy: user.id,
      })

      return recipes
    },
  })

  // Pre-fetch categories
  await queryClient.prefetchQuery({
    queryKey: recipeKeys.categories,
    queryFn: async () => {
      const categoryService = new CategoryService()
      const categories = await categoryService.getCategories()
      return categories
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RecipesPageContent initialSearchParams={params} />
    </HydrationBoundary>
  )
}