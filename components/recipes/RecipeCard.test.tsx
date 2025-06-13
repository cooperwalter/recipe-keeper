import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecipeCard } from './RecipeCard'
import { RecipeWithRelations } from '@/lib/types/recipe'

const mockRecipe: RecipeWithRelations = {
  id: '1',
  title: 'Test Recipe',
  description: 'A test recipe description',
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  createdBy: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPublic: false,
  sourceName: 'Test Source',
  sourceNotes: 'Test notes',
  version: 1,
  parentRecipeId: undefined,
  ingredients: [],
  instructions: [],
  photos: [
    {
      id: 'photo-1',
      recipeId: '1',
      photoUrl: 'https://example.com/photo.jpg',
      isOriginal: false,
      caption: 'Test photo',
      uploadedBy: 'user-1',
      uploadedAt: new Date().toISOString(),
    },
  ],
  categories: [],
  tags: ['quick', 'easy', 'dinner', 'pasta'],
  isFavorite: false,
}

describe('RecipeCard', () => {
  it('renders recipe information correctly', () => {
    render(<RecipeCard recipe={mockRecipe} />)
    
    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    expect(screen.getByText('A test recipe description')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument() // prep + cook time
    expect(screen.getByText('4 servings')).toBeInTheDocument()
  })

  it('displays recipe photo when available', () => {
    render(<RecipeCard recipe={mockRecipe} />)
    
    const img = screen.getByAltText('Test Recipe') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toBe('https://example.com/photo.jpg')
  })

  it('displays up to 3 tags with overflow indicator', () => {
    render(<RecipeCard recipe={mockRecipe} />)
    
    expect(screen.getByText('quick')).toBeInTheDocument()
    expect(screen.getByText('easy')).toBeInTheDocument()
    expect(screen.getByText('dinner')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument() // 4 tags total, showing 3
  })

  it('handles favorite toggle when callback provided', async () => {
    const onToggleFavorite = vi.fn().mockResolvedValue(undefined)
    render(<RecipeCard recipe={mockRecipe} onToggleFavorite={onToggleFavorite} />)
    
    const favoriteButton = screen.getByLabelText('Add to favorites')
    fireEvent.click(favoriteButton)
    
    expect(onToggleFavorite).toHaveBeenCalledWith('1')
  })

  it('shows filled heart when recipe is favorited', () => {
    const favoritedRecipe = { ...mockRecipe, isFavorite: true }
    render(<RecipeCard recipe={favoritedRecipe} onToggleFavorite={vi.fn()} />)
    
    const favoriteButton = screen.getByLabelText('Remove from favorites')
    expect(favoriteButton).toBeInTheDocument()
  })

  it('links to recipe detail page', () => {
    render(<RecipeCard recipe={mockRecipe} />)
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/protected/recipes/1')
  })

  it('prevents navigation when clicking favorite button', () => {
    const onToggleFavorite = vi.fn()
    render(<RecipeCard recipe={mockRecipe} onToggleFavorite={onToggleFavorite} />)
    
    const favoriteButton = screen.getByLabelText('Add to favorites')
    const event = new MouseEvent('click', { bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    
    fireEvent(favoriteButton, event)
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('handles recipes without photos', () => {
    const recipeWithoutPhoto = { ...mockRecipe, photos: [] }
    render(<RecipeCard recipe={recipeWithoutPhoto} />)
    
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
  })

  it('handles recipes without time information', () => {
    const recipeWithoutTime = { ...mockRecipe, prepTime: undefined, cookTime: undefined }
    render(<RecipeCard recipe={recipeWithoutTime} />)
    
    expect(screen.queryByText(/min/)).not.toBeInTheDocument()
  })

  it('handles recipes without servings', () => {
    const recipeWithoutServings = { ...mockRecipe, servings: undefined }
    render(<RecipeCard recipe={recipeWithoutServings} />)
    
    expect(screen.queryByText(/servings/)).not.toBeInTheDocument()
  })
})