/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlRecipePage from './page'
import { useRouter } from 'next/navigation'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn()
}))

vi.mock('@/lib/db/recipes', () => {
  const mockCreateRecipe = vi.fn()
  const mockAddRecipePhoto = vi.fn()
  
  return {
    RecipeService: vi.fn().mockImplementation(() => ({
      createRecipe: mockCreateRecipe,
      addRecipePhoto: mockAddRecipePhoto
    }))
  }
})

// Mock fetch
global.fetch = vi.fn()

describe('UrlRecipePage', () => {
  const mockPush = vi.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue(mockRouter)
  })

  it('renders the URL input form', () => {
    render(<UrlRecipePage />)
    
    expect(screen.getByText('Import Recipe from URL')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extract Recipe' })).toBeInTheDocument()
  })

  it('shows supported sites information', () => {
    render(<UrlRecipePage />)
    
    expect(screen.getByText(/Most major recipe websites/)).toBeInTheDocument()
    expect(screen.getByText(/Food blogs with properly formatted recipes/)).toBeInTheDocument()
    expect(screen.getByText(/Any site using Schema.org Recipe markup/)).toBeInTheDocument()
  })

  it('validates URL input', async () => {
    render(<UrlRecipePage />)
    
    const extractButton = screen.getByRole('button', { name: 'Extract Recipe' })
    
    // Button should be disabled when input is empty
    expect(extractButton).toBeDisabled()
    
    // Enter URL
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/recipe')
    
    // Button should be enabled
    expect(extractButton).not.toBeDisabled()
  })

  it('extracts recipe successfully', async () => {
    const mockRecipe = {
      title: 'Chocolate Cake',
      description: 'Delicious chocolate cake',
      ingredients: ['2 cups flour', '1 cup sugar', '1/2 cup cocoa'],
      instructions: ['Mix dry ingredients', 'Bake at 350°F'],
      prepTime: 15,
      cookTime: 30,
      servings: 8,
      sourceName: 'example.com',
      sourceUrl: 'https://example.com/recipe',
      imageUrl: 'https://example.com/cake.jpg',
      tags: ['dessert', 'chocolate']
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipe })
    })

    render(<UrlRecipePage />)
    
    // Enter URL and extract
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/recipe')
    
    const extractButton = screen.getByRole('button', { name: 'Extract Recipe' })
    await userEvent.click(extractButton)
    
    // Wait for extraction to complete
    await waitFor(() => {
      expect(screen.getByText('Recipe Preview')).toBeInTheDocument()
    })
    
    // Check extracted data is displayed
    expect(screen.getByDisplayValue('Chocolate Cake')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Delicious chocolate cake')).toBeInTheDocument()
    expect(screen.getByDisplayValue('15')).toBeInTheDocument() // prep time
    expect(screen.getByDisplayValue('30')).toBeInTheDocument() // cook time
    expect(screen.getByDisplayValue('8')).toBeInTheDocument() // servings
    
    // Check ingredients - now split into amount, unit, and ingredient fields
    // Since we have duplicate inputs for mobile/desktop, we need to be more specific
    // Check for visible amount inputs (mobile and desktop show different ones)
    const visibleAmountInputs = screen.getAllByPlaceholderText('Amount').filter(input => {
      return !input.closest('.hidden')
    })
    const visibleUnitInputs = screen.getAllByPlaceholderText('Unit').filter(input => {
      return !input.closest('.hidden')
    })
    const visibleIngredientInputs = screen.getAllByPlaceholderText('Ingredient').filter(input => {
      return !input.closest('.hidden')
    })
    
    // First ingredient: 2 cups flour
    expect(visibleAmountInputs[0]).toHaveValue(2)
    expect(visibleUnitInputs[0]).toHaveValue('cups')
    expect(visibleIngredientInputs[0]).toHaveValue('flour')
    
    // Second ingredient: 1 cup sugar
    expect(visibleAmountInputs[1]).toHaveValue(1)
    expect(visibleUnitInputs[1]).toHaveValue('cup')
    expect(visibleIngredientInputs[1]).toHaveValue('sugar')
    
    // Third ingredient: 1/2 cup cocoa
    expect(visibleAmountInputs[2]).toHaveValue(0.5) // 1/2 converted to decimal
    expect(visibleUnitInputs[2]).toHaveValue('cup')
    expect(visibleIngredientInputs[2]).toHaveValue('cocoa')
    
    // Check instructions
    expect(screen.getByDisplayValue('Mix dry ingredients')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bake at 350°F')).toBeInTheDocument()
    
    // Tags are temporarily disabled
    // expect(screen.getByText('dessert')).toBeInTheDocument()
    // expect(screen.getByText('chocolate')).toBeInTheDocument()
  })

  it('handles extraction errors', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ 
        error: 'No recipe found',
        message: 'This page does not appear to contain a recipe'
      })
    })

    render(<UrlRecipePage />)
    
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/not-a-recipe')
    
    const extractButton = screen.getByRole('button', { name: 'Extract Recipe' })
    await userEvent.click(extractButton)
    
    await waitFor(() => {
      expect(screen.getByText('This page does not appear to contain a recipe')).toBeInTheDocument()
    })
  })

  it('allows editing extracted recipe', async () => {
    const mockRecipe = {
      title: 'Original Title',
      description: 'Original description',
      ingredients: ['Ingredient 1'],
      instructions: ['Step 1'],
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      sourceUrl: 'https://example.com/recipe',
      tags: []
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipe })
    })

    render(<UrlRecipePage />)
    
    // Extract recipe
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/recipe')
    await userEvent.click(screen.getByRole('button', { name: 'Extract Recipe' }))
    
    await waitFor(() => {
      expect(screen.getByText('Recipe Preview')).toBeInTheDocument()
    })
    
    // Edit title
    const titleInput = screen.getByDisplayValue('Original Title')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Edited Title')
    
    // Add ingredient
    await userEvent.click(screen.getByRole('button', { name: 'Add Ingredient' }))
    // Find the new ingredient input (the last one with placeholder "Ingredient")
    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient')
    const newIngredientInput = ingredientInputs[ingredientInputs.length - 1]
    await userEvent.type(newIngredientInput, 'New ingredient')
    
    // Verify changes
    expect(screen.getByDisplayValue('Edited Title')).toBeInTheDocument()
    // Use getAllByDisplayValue since there might be duplicate inputs
    const newIngredientInputs = screen.getAllByDisplayValue('New ingredient')
    expect(newIngredientInputs.length).toBeGreaterThan(0)
  })

  it('saves recipe successfully', async () => {
    const mockRecipe = {
      title: 'Test Recipe',
      description: 'Test description',
      ingredients: ['Ingredient 1', 'Ingredient 2'],
      instructions: ['Step 1', 'Step 2'],
      prepTime: 15,
      cookTime: 30,
      servings: 6,
      sourceName: 'example.com',
      sourceUrl: 'https://example.com/recipe',
      imageUrl: 'https://example.com/image.jpg',
      tags: ['test']
    }

    // Mock extraction
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipe })
    })
    
    // Mock recipe creation
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-recipe-id' })
    })
    
    // Mock photo upload
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    render(<UrlRecipePage />)
    
    // Extract recipe
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/recipe')
    await userEvent.click(screen.getByRole('button', { name: 'Extract Recipe' }))
    
    await waitFor(() => {
      expect(screen.getByText('Recipe Preview')).toBeInTheDocument()
    })
    
    // Save recipe
    const saveButton = screen.getByRole('button', { name: /Save Recipe/ })
    await userEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/protected/recipes/new-recipe-id')
    })
  })

  it('disables save button when title is missing', async () => {
    const mockRecipe = {
      title: 'Test Recipe',
      description: '',
      ingredients: ['Ingredient 1'],
      instructions: [],
      sourceUrl: 'https://example.com/recipe',
      tags: []
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipe })
    })

    render(<UrlRecipePage />)
    
    // Extract recipe
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/recipe')
    await userEvent.click(screen.getByRole('button', { name: 'Extract Recipe' }))
    
    await waitFor(() => {
      expect(screen.getByText('Recipe Preview')).toBeInTheDocument()
    })
    
    const saveButton = screen.getByRole('button', { name: /Save Recipe/ })
    
    // Should be enabled initially
    expect(saveButton).not.toBeDisabled()
    
    // Clear title
    const titleInput = screen.getByDisplayValue('Test Recipe')
    await userEvent.clear(titleInput)
    
    // Should be disabled without title
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })
  })

  it('shows view original link', async () => {
    const mockRecipe = {
      title: 'Test Recipe',
      ingredients: ['Test'],
      instructions: ['Test'],
      sourceUrl: 'https://example.com/recipe',
      tags: []
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipe })
    })

    render(<UrlRecipePage />)
    
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/recipe')
    await userEvent.click(screen.getByRole('button', { name: 'Extract Recipe' }))
    
    await waitFor(() => {
      expect(screen.getByText('Recipe Preview')).toBeInTheDocument()
    })
    
    const viewOriginalLink = screen.getByRole('link', { name: /View Original/ })
    expect(viewOriginalLink).toHaveAttribute('href', 'https://example.com/recipe')
    expect(viewOriginalLink).toHaveAttribute('target', '_blank')
  })

  it('allows starting over', async () => {
    const mockRecipe = {
      title: 'Test Recipe',
      ingredients: ['Test'],
      instructions: ['Test'],
      sourceUrl: 'https://example.com/recipe',
      tags: []
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipe })
    })

    render(<UrlRecipePage />)
    
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/recipe')
    await userEvent.click(screen.getByRole('button', { name: 'Extract Recipe' }))
    
    await waitFor(() => {
      expect(screen.getByText('Recipe Preview')).toBeInTheDocument()
    })
    
    // Click start over
    await userEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    
    // Should reset to initial state
    expect(screen.queryByText('Recipe Preview')).not.toBeInTheDocument()
    expect(urlInput).toHaveValue('')
  })

  it('handles Enter key to extract', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        recipe: {
          title: 'Test',
          ingredients: ['Test'],
          instructions: ['Test'],
          sourceUrl: 'https://example.com/recipe',
          tags: []
        }
      })
    })

    render(<UrlRecipePage />)
    
    const urlInput = screen.getByPlaceholderText('https://example.com/recipes/chocolate-cake')
    await userEvent.type(urlInput, 'https://example.com/recipe')
    await userEvent.keyboard('{Enter}')
    
    // Wait for extraction to complete
    await waitFor(() => {
      expect(screen.getByText('Recipe Preview')).toBeInTheDocument()
    })
  })
})