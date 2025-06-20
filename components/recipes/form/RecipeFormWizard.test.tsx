import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecipeFormWizard } from './RecipeFormWizard'
import { RecipeFormProvider } from './RecipeFormContext'
import { useRouter } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock form step components
vi.mock('./BasicInfoStep', () => ({
  BasicInfoStep: () => <div data-testid="basic-info-step">Basic Info Step</div>,
}))

vi.mock('./IngredientsStep', () => ({
  IngredientsStep: () => <div data-testid="ingredients-step">Ingredients Step</div>,
}))

vi.mock('./InstructionsStep', () => ({
  InstructionsStep: () => <div data-testid="instructions-step">Instructions Step</div>,
}))

vi.mock('./PhotosNotesStep', () => ({
  PhotosNotesStep: () => <div data-testid="photos-notes-step">Photos Notes Step</div>,
}))

// Mock storage service
vi.mock('@/lib/supabase/storage', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    uploadRecipePhoto: vi.fn().mockResolvedValue('https://example.com/photo.jpg'),
  })),
}))

// Mock fetch
global.fetch = vi.fn()

describe('RecipeFormWizard', () => {
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    })
  })

  const renderWithProvider = (children: React.ReactNode, initialData?: Parameters<typeof RecipeFormProvider>[0]['initialData']) => {
    return render(
      <RecipeFormProvider initialData={initialData}>
        {children}
      </RecipeFormProvider>
    )
  }

  it('renders first step by default', () => {
    renderWithProvider(<RecipeFormWizard />)
    
    expect(screen.getByTestId('basic-info-step')).toBeInTheDocument()
    // The font-medium class is on the parent div, not the text
    const basicInfoText = screen.getByText('Basic Info')
    expect(basicInfoText.parentElement).toHaveClass('font-medium')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
  })

  it('navigates between steps', () => {
    const validData = {
      title: 'Test Recipe',
      ingredients: [{ ingredient: 'Test ingredient', amount: 1, unit: 'cup' }],
      instructions: [{ instruction: 'Test instruction', stepNumber: 1 }],
    }
    renderWithProvider(<RecipeFormWizard />, validData)
    
    // Should be on step 1
    expect(screen.getByTestId('basic-info-step')).toBeInTheDocument()
    
    // Click next
    fireEvent.click(screen.getByText('Next'))
    
    // Should be on step 2
    expect(screen.getByTestId('ingredients-step')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    
    // Click previous
    fireEvent.click(screen.getByText('Previous'))
    
    // Should be back on step 1
    expect(screen.getByTestId('basic-info-step')).toBeInTheDocument()
  })

  it('disables previous button on first step', () => {
    renderWithProvider(<RecipeFormWizard />)
    
    const previousButton = screen.getByText('Previous')
    expect(previousButton).toBeDisabled()
  })

  it('shows submit button on last step', () => {
    const validData = {
      title: 'Test Recipe',
      ingredients: [{ ingredient: 'Test ingredient', amount: 1, unit: 'cup' }],
      instructions: [{ instruction: 'Test instruction', stepNumber: 1 }],
    }
    renderWithProvider(<RecipeFormWizard />, validData)
    
    // Navigate to last step
    fireEvent.click(screen.getByText('Next')) // Step 2
    fireEvent.click(screen.getByText('Next')) // Step 3
    fireEvent.click(screen.getByText('Next')) // Step 4
    
    expect(screen.getByText('Create Recipe')).toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  it('submits form successfully', async () => {
    const mockRecipe = { id: '123', title: 'Test Recipe' }
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRecipe,
    })
    
    const validData = {
      title: 'Test Recipe',
      ingredients: [{ ingredient: 'Test ingredient', amount: 1, unit: 'cup' }],
      instructions: [{ instruction: 'Test instruction', stepNumber: 1 }],
    }
    renderWithProvider(<RecipeFormWizard />, validData)
    
    // Navigate to last step
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    
    // Click submit
    fireEvent.click(screen.getByText('Create Recipe'))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Recipe',
          description: '',
          prepTime: undefined,
          cookTime: undefined,
          servings: undefined,
          isPublic: false,
          sourceName: '',
          sourceNotes: '',
          ingredients: [{ ingredient: 'Test ingredient', amount: 1, unit: 'cup' }],
          instructions: ['Test instruction'],
          categoryIds: [],
          tags: [],
        }),
      })
    })
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/protected/recipes/123')
    })
  })

  it('handles submission error', async () => {
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    })
    
    const validData = {
      title: 'Test Recipe',
      ingredients: [{ ingredient: 'Test ingredient', amount: 1, unit: 'cup' }],
      instructions: [{ instruction: 'Test instruction', stepNumber: 1 }],
    }
    renderWithProvider(<RecipeFormWizard />, validData)
    
    // Navigate to last step
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    
    // Click submit
    fireEvent.click(screen.getByText('Create Recipe'))
    
    await waitFor(() => {
      expect(screen.getByText('Failed to create recipe. Please try again.')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    const validData = {
      title: 'Test Recipe',
      ingredients: [{ ingredient: 'Test ingredient', amount: 1, unit: 'cup' }],
      instructions: [{ instruction: 'Test instruction', stepNumber: 1 }],
    }
    renderWithProvider(<RecipeFormWizard />, validData)
    
    // Navigate to last step
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    
    // Click submit
    fireEvent.click(screen.getByText('Create Recipe'))
    
    expect(screen.getByText('Creating...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })

  it('displays step progress correctly', () => {
    const validData = {
      title: 'Test Recipe',
      ingredients: [{ ingredient: 'Test ingredient', amount: 1, unit: 'cup' }],
      instructions: [{ instruction: 'Test instruction', stepNumber: 1 }],
    }
    renderWithProvider(<RecipeFormWizard />, validData)
    
    // Step 1
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
    
    // Step 2
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    
    // Step 3
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75')
    
    // Step 4
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})