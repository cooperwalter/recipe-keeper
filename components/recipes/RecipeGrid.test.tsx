import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecipeGrid } from './RecipeGrid'
import { RecipeWithRelations } from '@/lib/types/recipe'

// Mock the RecipeCard component to avoid nested component issues
vi.mock('./RecipeCard', () => ({
  RecipeCard: ({ recipe, onToggleFavorite }: { recipe: RecipeWithRelations; onToggleFavorite?: (id: string) => void }) => (
    <div data-testid="recipe-card" data-recipe-id={recipe.id}>
      {recipe.title}
      {onToggleFavorite && <button onClick={() => onToggleFavorite(recipe.id)}>Toggle Favorite</button>}
    </div>
  )
}))

const mockRecipes: RecipeWithRelations[] = [
  {
    id: '1',
    title: 'Recipe 1',
    description: 'Description 1',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false,
    sourceName: undefined,
    sourceNotes: undefined,
    version: 1,
    parentRecipeId: undefined,
    ingredients: [],
    instructions: [],
    photos: [],
    categories: [],
    tags: [],
    isFavorite: false,
  },
  {
    id: '2',
    title: 'Recipe 2',
    description: 'Description 2',
    prepTime: 15,
    cookTime: 30,
    servings: 6,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: true,
    sourceName: undefined,
    sourceNotes: undefined,
    version: 1,
    parentRecipeId: undefined,
    ingredients: [],
    instructions: [],
    photos: [],
    categories: [],
    tags: [],
    isFavorite: true,
  },
]

describe('RecipeGrid', () => {
  it('renders recipes in a grid layout', () => {
    render(<RecipeGrid recipes={mockRecipes} />)
    
    expect(screen.getByText('Recipe 1')).toBeInTheDocument()
    expect(screen.getByText('Recipe 2')).toBeInTheDocument()
  })

  it('displays loading skeletons when isLoading is true', () => {
    const { container } = render(<RecipeGrid recipes={[]} isLoading={true} />)
    
    const skeletons = container.querySelectorAll('.rounded-lg.border.bg-card')
    expect(skeletons).toHaveLength(8) // Default skeleton count
  })

  it('displays empty state when no recipes', () => {
    render(<RecipeGrid recipes={[]} />)
    
    expect(screen.getByText('No recipes found')).toBeInTheDocument()
    expect(screen.getByText('Get started by creating your first recipe.')).toBeInTheDocument()
  })

  it('displays custom empty message', () => {
    render(<RecipeGrid recipes={[]} emptyMessage="No favorites yet" />)
    
    expect(screen.getByText('No favorites yet')).toBeInTheDocument()
  })

  it('passes onToggleFavorite to recipe cards', () => {
    const onToggleFavorite = vi.fn()
    render(
      <RecipeGrid recipes={mockRecipes} onToggleFavorite={onToggleFavorite} />
    )
    
    // Check that RecipeCard components are rendered with correct props
    const recipeCards = screen.getAllByTestId('recipe-card')
    expect(recipeCards).toHaveLength(2)
    
    // Check that the toggle favorite button is present
    const toggleButtons = screen.getAllByText('Toggle Favorite')
    expect(toggleButtons).toHaveLength(2)
  })

  it('renders with responsive grid classes', () => {
    const { container } = render(<RecipeGrid recipes={mockRecipes} />)
    
    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-3')
    expect(grid).toHaveClass('xl:grid-cols-4')
  })

  it('shows correct number of skeleton cards when loading', () => {
    const { container } = render(<RecipeGrid recipes={[]} isLoading={true} />)
    
    const skeletons = container.querySelectorAll('.rounded-lg.border.bg-card')
    expect(skeletons.length).toBe(8) // Should render 8 skeleton cards
    
    // Each skeleton should have the expected structure
    const firstSkeleton = skeletons[0]
    expect(firstSkeleton.querySelector('.h-48')).toBeInTheDocument() // Image skeleton
    expect(firstSkeleton.querySelector('.h-6')).toBeInTheDocument() // Title skeleton
    expect(firstSkeleton.querySelector('.h-4')).toBeInTheDocument() // Description skeleton
  })
})