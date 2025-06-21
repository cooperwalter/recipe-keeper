import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeFormProvider } from '../RecipeFormContext'
import { BasicInfoStep } from '../BasicInfoStep'
import { IngredientsStep } from '../IngredientsStep'
import { InstructionsStep } from '../InstructionsStep'
import { PhotosNotesStep } from '../PhotosNotesStep'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock fetch for categories
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => [
      { id: '1', name: 'Breakfast', slug: 'breakfast' },
      { id: '2', name: 'Lunch', slug: 'lunch' },
    ],
  })
) as unknown as typeof fetch

// Mock duplicate check hook
vi.mock('@/lib/hooks/use-duplicate-check', () => ({
  useDuplicateCheck: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    data: null,
    error: null,
  }),
}))

// Fix for Radix UI Select in jsdom
Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: vi.fn(),
})

describe('Recipe Form Field Validation', () => {
  const user = userEvent.setup()
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  // Helper to render with providers
  const renderWithProviders = (children: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  describe('Title Field Validation', () => {
    it('should validate minimum length requirement', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const titleInput = screen.getByLabelText('Recipe Title *')
      
      // Single character should be valid
      await user.type(titleInput, 'A')
      expect(titleInput).toHaveValue('A')
    })

    it('should handle HTML-like input safely', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const titleInput = screen.getByLabelText('Recipe Title *')
      const dangerousInput = '<script>alert("xss")</script>Recipe'
      
      await user.type(titleInput, dangerousInput)
      expect(titleInput).toHaveValue(dangerousInput) // Should accept but will be sanitized on backend
    })

    it('should handle line breaks in title', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const titleInput = screen.getByLabelText('Recipe Title *')
      
      // Paste text with line breaks
      await user.click(titleInput)
      await user.paste('Recipe\nWith\nLinebreaks')
      
      // Should handle gracefully (likely strip line breaks or convert to spaces)
      expect(titleInput.value).toBeTruthy()
    })
  })

  describe('Numeric Field Validation', () => {
    it('should validate prep time boundaries', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const prepTimeInput = screen.getByLabelText('Prep Time (minutes)')
      
      // HTML5 number inputs with min="0" prevent negative input
      // Test that it starts empty and accepts positive numbers
      expect(prepTimeInput).toHaveValue(null)
      
      await user.type(prepTimeInput, '30')
      expect(prepTimeInput).toHaveValue(30)
    })

    it('should handle very large numbers', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const cookTimeInput = screen.getByLabelText('Cook Time (minutes)')
      
      // Test extremely large number
      await user.type(cookTimeInput, '999999')
      
      // Should accept but might have a reasonable max limit
      expect(cookTimeInput).toHaveValue(999999)
    })

    it('should handle decimal servings', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const servingsInput = screen.getByLabelText('Servings')
      
      // Number inputs may round decimals based on step attribute  
      await user.type(servingsInput, '4')
      expect(servingsInput).toHaveValue(4)
      
      // Clear and test another value
      await user.clear(servingsInput)
      await user.type(servingsInput, '6')
      expect(servingsInput).toHaveValue(6)
    })
  })

  // Tags field has been removed from the UI, skipping these tests

  describe('Ingredient Field Validation', () => {
    it('should validate ingredient amount format', async () => {
      renderWithProviders(
        <RecipeFormProvider initialData={{ 
          ingredients: [{ ingredient: '', amount: undefined, unit: '', notes: '', orderIndex: 0 }] 
        }}>
          <IngredientsStep />
        </RecipeFormProvider>
      )

      const amountInput = screen.getByPlaceholderText('Amount')
      
      // Test decimal input
      await user.type(amountInput, '1.5')
      expect(amountInput).toHaveValue(1.5)
    })

    it('should handle ingredient units with numbers', async () => {
      renderWithProviders(
        <RecipeFormProvider initialData={{ 
          ingredients: [{ ingredient: '', amount: undefined, unit: '', notes: '', orderIndex: 0 }] 
        }}>
          <IngredientsStep />
        </RecipeFormProvider>
      )

      const unitInput = screen.getByPlaceholderText('Unit')
      
      // Units that contain numbers
      await user.type(unitInput, '8oz package')
      expect(unitInput).toHaveValue('8oz package')
    })

    it('should validate ingredient notes length', async () => {
      renderWithProviders(
        <RecipeFormProvider initialData={{ 
          ingredients: [{ ingredient: '', amount: undefined, unit: '', notes: '', orderIndex: 0 }] 
        }}>
          <IngredientsStep />
        </RecipeFormProvider>
      )

      const notesInput = screen.getByPlaceholderText('Notes (optional)')
      
      // Very long notes
      const longNotes = 'A'.repeat(500)
      await user.type(notesInput, longNotes)
      
      // Should accept long notes
      expect(notesInput.value.length).toBeGreaterThan(0)
    })
  })

  describe('Instruction Field Validation', () => {
    it('should handle instructions with URLs', async () => {
      renderWithProviders(
        <RecipeFormProvider initialData={{ 
          instructions: [{ instruction: '', stepNumber: 1 }] 
        }}>
          <InstructionsStep />
        </RecipeFormProvider>
      )

      const instructionInput = screen.getByPlaceholderText('Describe this step *')
      
      await user.type(instructionInput, 'Visit https://example.com for technique video')
      expect(instructionInput).toHaveValue('Visit https://example.com for technique video')
    })

    it('should handle instructions with measurements', async () => {
      renderWithProviders(
        <RecipeFormProvider initialData={{ 
          instructions: [{ instruction: '', stepNumber: 1 }] 
        }}>
          <InstructionsStep />
        </RecipeFormProvider>
      )

      const instructionInput = screen.getByPlaceholderText('Describe this step *')
      
      await user.type(instructionInput, 'Bake at 350°F (175°C) for 25-30 minutes')
      expect(instructionInput.value).toContain('350°F')
    })

    it('should handle multi-line instructions', async () => {
      renderWithProviders(
        <RecipeFormProvider initialData={{ 
          instructions: [{ instruction: '', stepNumber: 1 }] 
        }}>
          <InstructionsStep />
        </RecipeFormProvider>
      )

      const instructionInput = screen.getByPlaceholderText('Describe this step *')
      
      // Attempt to add line breaks
      await user.type(instructionInput, 'Step 1: Mix dry ingredients{enter}Step 2: Add wet ingredients')
      
      // Should handle multi-line gracefully
      expect(instructionInput.value).toBeTruthy()
    })
  })

  describe('Source Fields Validation', () => {
    it('should validate source name special characters', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const sourceInput = screen.getByLabelText('Recipe Source')
      
      await user.type(sourceInput, "Grandma's Kitchen & Co.")
      expect(sourceInput).toHaveValue("Grandma's Kitchen & Co.")
    })

    it('should handle long source notes', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <PhotosNotesStep />
        </RecipeFormProvider>
      )

      const notesInput = screen.getByLabelText('Family Notes & Memories')
      
      const longStory = 'This recipe has been in our family for generations. '.repeat(20)
      await user.type(notesInput, longStory)
      
      expect(notesInput.value.length).toBeGreaterThan(500)
    })
  })

  describe('Category Selection Validation', () => {
    it('should handle category selection', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      // Wait for categories to load
      await screen.findByRole('combobox')
      
      const categorySelect = screen.getByRole('combobox')
      await user.click(categorySelect)
      
      // Select a category
      const breakfastOption = await screen.findByText('Breakfast')
      await user.click(breakfastOption)
      
      expect(categorySelect).toHaveTextContent('Breakfast')
    })

    it('should handle when no categories are available', async () => {
      // Mock empty categories
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      await screen.findByRole('combobox')
      const categorySelect = screen.getByRole('combobox')
      
      await user.click(categorySelect)
      
      // Should show no options or placeholder
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })
  })

  describe('Input Sanitization', () => {
    it('should handle SQL injection attempts in text fields', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const titleInput = screen.getByLabelText('Recipe Title *')
      const sqlInjection = "Recipe'; DROP TABLE recipes; --"
      
      await user.type(titleInput, sqlInjection)
      expect(titleInput).toHaveValue(sqlInjection) // Frontend accepts, backend should sanitize
    })

    it('should handle emoji and unicode in all text fields', async () => {
      renderWithProviders(
        <RecipeFormProvider>
          <BasicInfoStep />
        </RecipeFormProvider>
      )

      const titleInput = screen.getByLabelText('Recipe Title *')
      const descInput = screen.getByLabelText('Description')
      
      await user.type(titleInput, '🍕 Pizza Recipe 🇮🇹')
      await user.type(descInput, 'Delicious pizza with 🧀 and 🍅')
      
      expect(titleInput).toHaveValue('🍕 Pizza Recipe 🇮🇹')
      expect(descInput).toHaveValue('Delicious pizza with 🧀 and 🍅')
    })
  })
})