'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { RecipeGrid } from '@/components/recipes/RecipeGrid'
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
import { Plus, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { RecipeListResponse, RecipeCategory } from '@/lib/types/recipe'

const ITEMS_PER_PAGE = 12

function RecipesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [recipes, setRecipes] = useState<RecipeListResponse>({
    recipes: [],
    total: 0,
    hasMore: false,
  })
  const [categories, setCategories] = useState<RecipeCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [isSearching, setIsSearching] = useState(false)
  
  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  // Fetch recipes when search params change
  useEffect(() => {
    fetchRecipes()
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle real-time search with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Don't search if the query is the same as in URL
    if (searchQuery === (searchParams.get('q') || '')) {
      return
    }

    setIsSearching(true)

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      updateSearchParams({ q: searchQuery, page: '1' })
    }, 300) // 300ms debounce

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecipes = async () => {
    setIsLoading(true)
    setIsSearching(false)
    try {
      const params = new URLSearchParams()
      const urlQuery = searchParams.get('q') || ''
      const urlCategory = searchParams.get('category') || 'all'
      
      if (urlQuery) params.append('query', urlQuery)
      if (urlCategory && urlCategory !== 'all') {
        params.append('categoryId', urlCategory)
      }
      params.append('limit', ITEMS_PER_PAGE.toString())
      params.append('offset', ((currentPage - 1) * ITEMS_PER_PAGE).toString())

      const response = await fetch(`/api/recipes?${params}`)
      if (!response.ok) throw new Error('Failed to fetch recipes')
      
      const data: RecipeListResponse = await response.json()
      setRecipes(data)
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    updateSearchParams({ q: '', page: '1' })
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
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
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to toggle favorite')
      
      const { isFavorite } = await response.json()
      
      // Update the recipe in the list
      setRecipes(prev => ({
        ...prev,
        recipes: prev.recipes.map(recipe =>
          recipe.id === recipeId ? { ...recipe, isFavorite } : recipe
        ),
      }))
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const totalPages = Math.ceil(recipes.total / ITEMS_PER_PAGE)

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

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
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
        
        <Select value={searchParams.get('category') || 'all'} onValueChange={handleCategoryChange}>
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
      </div>

      <RecipeGrid
        recipes={recipes.recipes}
        isLoading={isLoading}
        onToggleFavorite={handleToggleFavorite}
        emptyMessage={
          searchQuery || selectedCategory !== 'all'
            ? 'No recipes found matching your criteria'
            : 'No recipes yet'
        }
      />

      <RecipePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecipesPageContent />
    </Suspense>
  )
}