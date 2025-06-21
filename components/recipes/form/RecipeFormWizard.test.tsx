import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { RecipeFormWizard } from './RecipeFormWizard'
import { RecipeFormProvider } from './RecipeFormContext'
import { useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'

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

// Mock duplicate check hook
vi.mock('@/lib/hooks/use-duplicate-check', () => ({
  useDuplicateCheck: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    data: { duplicates: [], totalChecked: 1 },
    reset: vi.fn(),
  }),
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
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RecipeFormProvider initialData={initialData}>
            {children}
          </RecipeFormProvider>
        </TooltipProvider>
      </QueryClientProvider>
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
    
    // Wait for duplicate check dialog and click Continue
    await waitFor(() => {
      expect(screen.getByText('Checking for Similar Recipes')).toBeInTheDocument()
    })
    
    // Click Continue in the duplicate check dialog
    const continueButton = await screen.findByRole('button', { name: 'Continue' })
    fireEvent.click(continueButton)
    
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

  it.skip('handles submission error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
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
    
    // Mock recipe creation failure
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })
    
    // Click submit
    fireEvent.click(screen.getByText('Create Recipe'))
    
    // Wait for duplicate check dialog and click Continue
    await waitFor(() => {
      expect(screen.getByText('Checking for Similar Recipes')).toBeInTheDocument()
    })
    
    const continueButton = await screen.findByRole('button', { name: 'Continue' })
    fireEvent.click(continueButton)
    
    // Wait for the dialog to close
    await waitFor(() => {
      expect(screen.queryByText('Checking for Similar Recipes')).not.toBeInTheDocument()
    })
    
    // The error should now be visible
    await waitFor(() => {
      // Look for the error div with the destructive background class
      const errorDiv = screen.getByText('Failed to create recipe. Please try again.')
      expect(errorDiv).toBeInTheDocument()
    })
    
    // Verify console.error was called
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating recipe:', expect.any(Error))
    
    // Verify the Create Recipe button is enabled again after error
    expect(screen.getByText('Create Recipe')).not.toBeDisabled()
    
    consoleErrorSpy.mockRestore()
  })

  it('shows loading state during submission', async () => {
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
    
    // Should show the duplicate check dialog which is in loading state
    await waitFor(() => {
      expect(screen.getByText('Checking for Similar Recipes')).toBeInTheDocument()
    })
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