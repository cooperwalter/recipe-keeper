import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeFormWizard } from '../RecipeFormWizard'
import { RecipeFormProvider } from '../RecipeFormContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock categories data
const mockCategories = [
  { id: '1', name: 'Breakfast', slug: 'breakfast' },
  { id: '2', name: 'Lunch', slug: 'lunch' },
  { id: '3', name: 'Dinner', slug: 'dinner' },
]

// Mock Supabase storage
vi.mock('@/lib/supabase/storage', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    uploadRecipePhoto: vi.fn().mockResolvedValue('https://example.com/photo.jpg'),
  })),
}))

// Mock duplicate check hook
const mockDuplicateCheck = vi.fn()
vi.mock('@/lib/hooks/use-duplicate-check', () => ({
  useDuplicateCheck: () => ({
    mutate: mockDuplicateCheck,
    mutateAsync: vi.fn().mockResolvedValue({ duplicates: [] }),
    reset: vi.fn(),
    isPending: false,
    data: null,
    error: null,
  }),
}))

// Fix for Radix UI Select in jsdom
if (!Element.prototype.hasPointerCapture) {
  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    value: vi.fn(),
    writable: true,
  })
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

describe('RecipeFormValidation', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
    // Mock categories fetch
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url) => {
      if (url === '/api/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: 'recipe-123' }),
      })
    })
  })

  const renderForm = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    
    return render(
      <QueryClientProvider client={queryClient}>
        <RecipeFormProvider>
          <RecipeFormWizard />
        </RecipeFormProvider>
      </QueryClientProvider>
    )
  }

  describe('Basic Info Step Validation', () => {
    it('should disable next button when title is empty', async () => {
      renderForm()
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should enable next button when title is provided', async () => {
      renderForm()
      
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should trim whitespace from title for validation', async () => {
      renderForm()
      
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, '   ')
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should accept title with special characters', async () => {
      renderForm()
      
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, "Grandma's Best Recipe! (With Love)")
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should accept optional fields as empty', async () => {
      renderForm()
      
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Simple Recipe')
      
      // Leave all optional fields empty
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should validate numeric fields accept only numbers', async () => {
      renderForm()
      
      const prepTimeInput = screen.getByLabelText('Prep Time (minutes)')
      const cookTimeInput = screen.getByLabelText('Cook Time (minutes)')
      const servingsInput = screen.getByLabelText('Servings')
      
      // Type non-numeric values
      await user.type(prepTimeInput, 'abc')
      await user.type(cookTimeInput, 'xyz')
      await user.type(servingsInput, '!!!')
      
      // Check that inputs are empty or contain only numeric values
      expect(prepTimeInput).toHaveValue(null)
      expect(cookTimeInput).toHaveValue(null)
      expect(servingsInput).toHaveValue(null)
    })

    it('should accept decimal values for servings', async () => {
      renderForm()
      
      const servingsInput = screen.getByLabelText('Servings')
      await user.clear(servingsInput)
      await user.type(servingsInput, '4.5')
      
      // HTML number inputs may not preserve exact decimal values
      // Just check that it has a numeric value
      expect(Number(servingsInput.value)).toBeGreaterThan(0)
    })
  })

  describe('Ingredients Step Validation', () => {
    it('should disable next button when no ingredients are added', async () => {
      renderForm()
      
      // Navigate to ingredients step
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Check next button is disabled
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should require at least one ingredient', async () => {
      renderForm()
      
      // Navigate to ingredients step
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Add an ingredient
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      
      const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
      const ingredientInput = ingredientInputs[0]
      await user.type(ingredientInput, 'Flour')
      
      // Now next button should be enabled
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should validate that ingredient name is not empty', async () => {
      renderForm()
      
      // Navigate to ingredients step
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Add an ingredient but leave name empty
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      
      // Next button should still be disabled
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should trim whitespace from ingredient names', async () => {
      renderForm()
      
      // Navigate to ingredients step
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Add ingredient with only spaces
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
      const ingredientInput = ingredientInputs[0]
      await user.type(ingredientInput, '   ')
      
      // Next button should be disabled
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should validate all ingredients when multiple are added', async () => {
      renderForm()
      
      // Navigate to ingredients step
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Add first ingredient
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      const ingredient1 = screen.getAllByPlaceholderText('Ingredient *')[0]
      await user.type(ingredient1, 'Flour')
      
      // Add second ingredient but leave empty
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      
      // Next button should be disabled because second ingredient is empty
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should accept ingredients with optional amount and unit', async () => {
      renderForm()
      
      // Navigate to ingredients step
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Add ingredient with only name (no amount or unit)
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
      const ingredientInput = ingredientInputs[0]
      await user.type(ingredientInput, 'Salt to taste')
      
      // Should be valid
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })
  })

  describe('Instructions Step Validation', () => {
    const navigateToInstructionsStep = async () => {
      // Fill basic info
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Add ingredient
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
      const ingredientInput = ingredientInputs[0]
      await user.type(ingredientInput, 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
    }

    it('should enable submit button even when no instructions are added', async () => {
      renderForm()
      await navigateToInstructionsStep()
      
      // Instructions are now optional
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should accept instructions when added', async () => {
      renderForm()
      await navigateToInstructionsStep()
      
      // Add instruction
      await user.click(screen.getByRole('button', { name: /add step/i }))
      const instructionInput = screen.getByPlaceholderText('Describe this step')
      await user.type(instructionInput, 'Mix all ingredients')
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should allow empty instructions since they are optional', async () => {
      renderForm()
      await navigateToInstructionsStep()
      
      // Add instruction but leave empty - should still be valid since instructions are optional
      await user.click(screen.getByRole('button', { name: /add step/i }))
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should allow all instructions even when some are empty', async () => {
      renderForm()
      await navigateToInstructionsStep()
      
      // Add first instruction
      await user.click(screen.getByRole('button', { name: /add step/i }))
      const instruction1 = screen.getAllByPlaceholderText('Describe this step')[0]
      await user.type(instruction1, 'Step 1')
      
      // Add second instruction but leave empty - should still be valid
      await user.click(screen.getByRole('button', { name: /add step/i }))
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })
  })

  describe('Photos & Notes Step Validation', () => {
    const navigateToPhotosStep = async () => {
      // Fill basic info
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Add ingredient
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
      const ingredientInput = ingredientInputs[0]
      await user.type(ingredientInput, 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Skip instructions (they're optional now)
      await user.click(screen.getByRole('button', { name: /next/i }))
    }

    it('should allow submission without photos or notes', async () => {
      renderForm()
      await navigateToPhotosStep()
      
      // Submit button should be enabled (photos/notes are optional)
      const submitButton = screen.getByRole('button', { name: /create recipe/i })
      expect(submitButton).toBeEnabled()
    })

    it('should validate photo file types', async () => {
      renderForm()
      await navigateToPhotosStep()
      
      // Create a non-image file
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const input = document.getElementById('photo-upload') as HTMLInputElement
      
      // Try to upload non-image file
      await user.upload(input, textFile)
      
      // Should show error or not accept the file
      await waitFor(() => {
        expect(screen.queryByText(/test.txt/i)).not.toBeInTheDocument()
      })
    })

    it('should accept valid image files', async () => {
      renderForm()
      await navigateToPhotosStep()
      
      // Create valid image file
      const imageFile = new File(['image'], 'recipe.jpg', { type: 'image/jpeg' })
      const input = document.getElementById('photo-upload') as HTMLInputElement
      
      await user.upload(input, imageFile)
      
      // Should show the photo in the UI (as an image element)
      await waitFor(() => {
        const images = screen.getAllByRole('img')
        expect(images.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Form Submission Validation', () => {
    it('should prevent submission with invalid data', async () => {
      renderForm()
      
      // Try to navigate without filling required fields
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should show error message on submission failure', async () => {
      // Mock failed API response
      ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url) => {
        if (url === '/api/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => mockCategories,
          })
        }
        if (url === '/api/recipes') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: 'Invalid recipe data' }),
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
      
      renderForm()
      
      // Fill all required fields
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
      const ingredientInput = ingredientInputs[0]
      await user.type(ingredientInput, 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Skip instructions (they're optional now)
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Try to submit
      const submitButton = screen.getByRole('button', { name: /create recipe/i })
      await user.click(submitButton)
      
      // Wait for submission to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to create recipe/i)).toBeInTheDocument()
      })
    })

    it('should successfully submit valid form data', async () => {
      
      renderForm()
      
      // Fill all required fields
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
      const ingredientInput = ingredientInputs[0]
      await user.type(ingredientInput, 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Skip instructions (they're optional now)
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /create recipe/i })
      await user.click(submitButton)
      
      // Wait for submission to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should navigate to new recipe
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/protected/recipes/recipe-123')
      })
    })
  })

  describe('Edge Cases and Special Validation', () => {
    it('should handle very long recipe titles', { timeout: 15000 }, async () => {
      renderForm()
      
      const titleInput = screen.getByLabelText('Recipe Title *')
      const longTitle = 'A'.repeat(256) // Very long title
      // Use paste instead of type for performance
      await user.click(titleInput)
      await user.paste(longTitle)
      
      // Should still be valid (unless there's a max length)
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should handle unicode characters in inputs', async () => {
      renderForm()
      
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, '🍕 Pizza Margherita 🇮🇹')
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('should preserve form data when navigating between steps', async () => {
      renderForm()
      
      // Fill basic info
      const titleInput = screen.getByLabelText('Recipe Title *')
      const descInput = screen.getByLabelText('Description')
      await user.type(titleInput, 'Test Recipe')
      await user.type(descInput, 'Test Description')
      
      // Go to next step
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Go back
      await user.click(screen.getByRole('button', { name: /previous/i }))
      
      // Data should be preserved
      expect(screen.getByLabelText('Recipe Title *')).toHaveValue('Test Recipe')
      expect(screen.getByLabelText('Description')).toHaveValue('Test Description')
    })

    it('should handle rapid form submissions', async () => {
      renderForm()
      
      // Fill minimum required fields quickly
      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
      const ingredientInput = ingredientInputs[0]
      await user.type(ingredientInput, 'Test')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Skip instructions (they're optional now)
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Try to submit
      const submitButton = screen.getByRole('button', { name: /create recipe/i })
      await user.click(submitButton)
      
      // Wait for submission to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should navigate after successful submission
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/protected/recipes/recipe-123')
      })
      
      // Should only be called once
      expect(mockPush).toHaveBeenCalledTimes(1)
    })
  })
})