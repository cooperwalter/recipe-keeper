import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeFormWizard } from '../RecipeFormWizard'
import { RecipeFormProvider } from '../RecipeFormContext'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Supabase storage
const mockUploadRecipePhoto = vi.fn()
vi.mock('@/lib/supabase/storage', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    uploadRecipePhoto: mockUploadRecipePhoto,
  })),
}))

// Mock localStorage for draft persistence
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Recipe Form Error Handling', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful categories fetch by default
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', name: 'Breakfast', slug: 'breakfast' },
      ],
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const renderForm = () => {
    return render(
      <RecipeFormProvider>
        <RecipeFormWizard />
      </RecipeFormProvider>
    )
  }

  describe('Network Error Handling', () => {
    it('should handle network failure during recipe submission', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: '1', name: 'Breakfast' }],
          })
        }
        if (url === '/api/recipes') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })

      renderForm()
      
      // Fill required fields quickly
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Try to submit
      await user.click(screen.getByRole('button', { name: /create recipe/i }))
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to create recipe/i)).toBeInTheDocument()
      })
    })

    it('should handle server error responses', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: '1', name: 'Breakfast' }],
          })
        }
        if (url === '/api/recipes') {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: 'Database connection failed' }),
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })

      renderForm()
      
      // Fill and submit form
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /create recipe/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/failed to create recipe/i)).toBeInTheDocument()
      })
    })

    it('should handle timeout errors', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: '1', name: 'Breakfast' }],
          })
        }
        if (url === '/api/recipes') {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 100)
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })

      renderForm()
      
      // Fill and submit
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /create recipe/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/failed to create recipe/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Photo Upload Error Handling', () => {
    it('should handle photo upload failures gracefully', async () => {
      // Configure mock to fail
      mockUploadRecipePhoto.mockRejectedValue(new Error('Upload failed'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderForm()
      
      // Navigate to photos step
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Add a photo
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = document.getElementById('photo-upload') as HTMLInputElement
      await user.upload(input, file)
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /create recipe/i }))
      
      // Should still create recipe even if photo upload fails
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalledWith('Error uploading photo:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
      
      // Reset the mock for next tests
      mockUploadRecipePhoto.mockResolvedValue('https://example.com/photo.jpg')
    })

    it('should handle invalid file types', async () => {
      renderForm()
      
      // Navigate to photos step
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Try to upload non-image file
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const input = document.getElementById('photo-upload') as HTMLInputElement
      await user.upload(input, file)
      
      // File should not be accepted
      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
      })
    })
  })

  describe('Draft Persistence Error Handling', () => {
    it('should handle localStorage errors when saving draft', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderForm()
      
      // Type something to trigger draft save
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      
      // Wait for debounced save
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      }, { timeout: 2000 })
      
      // Should handle error gracefully
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('draft'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle corrupted draft data', async () => {
      localStorageMock.getItem.mockReturnValue('{ invalid json')
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderForm()
      
      // Should render form normally despite corrupted draft
      expect(screen.getByLabelText('Recipe Title *')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    it('should clear draft after successful submission', async () => {
      renderForm()
      
      // Fill and submit form
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /create recipe/i }))
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('recipe-draft')
      })
    })
  })

  describe('Validation Error Messages', () => {
    it('should show validation feedback for required fields', async () => {
      renderForm()
      
      // Try to proceed without filling title
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
      
      // Visual feedback that title is required
      const titleLabel = screen.getByText('Recipe Title *')
      expect(titleLabel).toContainHTML('*')
    })

    it('should handle malformed API responses', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: '1', name: 'Breakfast' }],
          })
        }
        if (url === '/api/recipes') {
          return Promise.resolve({
            ok: true,
            json: async () => null, // Malformed response
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
      
      renderForm()
      
      // Fill and submit
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /create recipe/i }))
      
      // Should handle gracefully
      await waitFor(() => {
        expect(screen.getByText(/failed to create recipe/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Feedback', () => {
    it('should show loading state during submission', async () => {
      // Delay API response
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: '1', name: 'Breakfast' }],
          })
        }
        if (url === '/api/recipes') {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ id: 'recipe-123' }),
              })
            }, 1000)
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
      
      renderForm()
      
      // Fill form
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Submit
      await user.click(screen.getByRole('button', { name: /create recipe/i }))
      
      // Should show loading state
      expect(screen.getByText(/creating/i)).toBeInTheDocument()
      
      // Should be disabled during submission
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
    })

    it('should prevent double submission', async () => {
      let callCount = 0
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: '1', name: 'Breakfast' }],
          })
        }
        if (url === '/api/recipes') {
          callCount++
          // Add a delay to simulate slower API response
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ id: 'recipe-123' }),
              })
            }, 200)
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
      
      renderForm()
      
      // Fill form
      await user.type(screen.getByLabelText('Recipe Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add ingredient/i }))
      await user.type(screen.getByPlaceholderText('Ingredient *'), 'Flour')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      await user.click(screen.getByRole('button', { name: /add step/i }))
      await user.type(screen.getByPlaceholderText('Describe this step *'), 'Mix')
      await user.click(screen.getByRole('button', { name: /next/i }))
      
      // Try to submit multiple times
      const submitButton = screen.getByRole('button', { name: /create recipe/i })
      
      // Click once to start submission
      await user.click(submitButton)
      
      // Wait for button to be disabled (isSubmitting state)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
      })
      
      // Try clicking again while disabled - these won't trigger new submissions
      await user.click(screen.getByRole('button', { name: /creating/i }))
      await user.click(screen.getByRole('button', { name: /creating/i }))
      
      // Should only submit once
      expect(callCount).toBe(1)
    })
  })
})