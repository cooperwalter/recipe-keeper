'use client'

import { useState, useEffect } from 'react'
import { RecipeGrid } from '@/components/recipes/RecipeGrid'
import { RecipeList } from '@/components/recipes/RecipeList'
import { RecipePagination } from '@/components/recipes/RecipePagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Plus, Search, X, Grid, List, Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRecipes, useCategories, useToggleFavorite } from '@/lib/hooks/use-recipes'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'

const ITEMS_PER_PAGE = 12

interface RecipesPageContentProps {
  initialSearchParams?: {
    q?: string
    category?: string
    page?: string
    view?: string
  }
}

export default function RecipesPageContent({ initialSearchParams }: RecipesPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Use initial params from server, then client-side params
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('q') || initialSearchParams?.q || ''
  )
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    (searchParams.get('view') || initialSearchParams?.view || 'grid') as 'grid' | 'list'
  )
  
  const currentPage = parseInt(
    searchParams.get('page') || initialSearchParams?.page || '1', 
    10
  )
  const selectedCategory = searchParams.get('category') || initialSearchParams?.category || 'all'
  
  // Debounce search query
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)
  
  // Use React Query hooks - will use pre-fetched data on first render
  const { data: recipesData, isLoading: isLoadingRecipes } = useRecipes({
    query: debouncedSearchQuery,
    categoryId: selectedCategory,
    page: currentPage,
  })
  
  const { data: categories = [] } = useCategories()
  const toggleFavorite = useToggleFavorite()

  const handleClearSearch = () => {
    setSearchQuery('')
    updateSearchParams({ q: '', page: '1' })
  }

  const handleCategoryChange = (category: string) => {
    updateSearchParams({ category, page: '1' })
  }

  const handlePageChange = (page: number) => {
    updateSearchParams({ page: page.toString() })
  }

  const updateSearchParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`/protected/recipes?${params.toString()}`)
  }

  const handleToggleFavorite = async (recipeId: string) => {
    toggleFavorite.mutate(recipeId)
  }

  const handleViewModeChange = (mode: string) => {
    if (mode === 'grid' || mode === 'list') {
      setViewMode(mode)
      // Update URL without triggering navigation
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', mode)
      window.history.replaceState(null, '', `?${params.toString()}`)
    }
  }

  // Update URL when debounced search changes
  useEffect(() => {
    if (debouncedSearchQuery !== (searchParams.get('q') || '')) {
      const params = new URLSearchParams(searchParams.toString())
      
      if (debouncedSearchQuery) {
        params.set('q', debouncedSearchQuery)
      } else {
        params.delete('q')
      }
      params.set('page', '1')

      router.push(`/protected/recipes?${params.toString()}`)
    }
  }, [debouncedSearchQuery, searchParams, router])

  const recipes = recipesData?.recipes || []
  const totalPages = Math.ceil((recipesData?.total || 0) / ITEMS_PER_PAGE)
  
  // Sort recipes to show favorites first
  const favorited = recipes.filter(r => r.isFavorite)
  const nonFavorited = recipes.filter(r => !r.isFavorite)
  const sortedRecipes = { favorited, nonFavorited, all: [...favorited, ...nonFavorited] }

  const isSearching = searchQuery !== debouncedSearchQuery

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">My Recipes</h1>
        <Link href="/protected/recipes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Recipe
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isSearching && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} className="justify-center">
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === 'grid' ? (
        <div>
          {sortedRecipes.favorited.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                <h2 className="text-lg font-semibold">Favorites</h2>
                <span className="text-sm text-muted-foreground">({sortedRecipes.favorited.length})</span>
              </div>
              <RecipeGrid
                recipes={sortedRecipes.favorited}
                isLoading={isLoadingRecipes}
                onToggleFavorite={handleToggleFavorite}
                emptyMessage=""
              />
              {sortedRecipes.nonFavorited.length > 0 && (
                <div className="mt-8 mb-4 border-t pt-8">
                  <h2 className="text-lg font-semibold mb-4">All Recipes</h2>
                </div>
              )}
            </>
          )}
          {(sortedRecipes.favorited.length === 0 || sortedRecipes.nonFavorited.length > 0) && (
            <RecipeGrid
              recipes={sortedRecipes.favorited.length > 0 ? sortedRecipes.nonFavorited : sortedRecipes.all}
              isLoading={isLoadingRecipes && sortedRecipes.favorited.length === 0}
              onToggleFavorite={handleToggleFavorite}
              emptyMessage={
                searchQuery || selectedCategory !== 'all'
                  ? 'No recipes found matching your criteria'
                  : 'No recipes yet'
              }
            />
          )}
        </div>
      ) : (
        <div>
          {sortedRecipes.favorited.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                <h2 className="text-lg font-semibold">Favorites</h2>
                <span className="text-sm text-muted-foreground">({sortedRecipes.favorited.length})</span>
              </div>
              <RecipeList
                recipes={sortedRecipes.favorited}
                isLoading={isLoadingRecipes}
                onToggleFavorite={handleToggleFavorite}
                emptyMessage=""
              />
              {sortedRecipes.nonFavorited.length > 0 && (
                <div className="mt-8 mb-4 border-t pt-8">
                  <h2 className="text-lg font-semibold mb-4">All Recipes</h2>
                </div>
              )}
            </>
          )}
          {(sortedRecipes.favorited.length === 0 || sortedRecipes.nonFavorited.length > 0) && (
            <RecipeList
              recipes={sortedRecipes.favorited.length > 0 ? sortedRecipes.nonFavorited : sortedRecipes.all}
              isLoading={isLoadingRecipes && sortedRecipes.favorited.length === 0}
              onToggleFavorite={handleToggleFavorite}
              emptyMessage={
                searchQuery || selectedCategory !== 'all'
                  ? 'No recipes found matching your criteria'
                  : 'No recipes yet'
              }
            />
          )}
        </div>
      )}

      <RecipePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}