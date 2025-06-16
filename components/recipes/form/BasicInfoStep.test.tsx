import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BasicInfoStep } from './BasicInfoStep'
import { RecipeFormProvider } from './RecipeFormContext'

// Mock fetch
global.fetch = vi.fn()

// Mock categories data
const mockCategories = [
  { id: '1', name: 'Breakfast', slug: 'breakfast' },
  { id: '2', name: 'Lunch', slug: 'lunch' },
  { id: '3', name: 'Dinner', slug: 'dinner' },
]

describe('BasicInfoStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    })
  })

  const renderWithProvider = () => {
    return render(
      <RecipeFormProvider>
        <BasicInfoStep />
      </RecipeFormProvider>
    )
  }

  it('renders all form fields', async () => {
    renderWithProvider()
    
    await waitFor(() => {
      expect(screen.getByLabelText('Recipe Title *')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Prep Time (minutes)')).toBeInTheDocument()
      expect(screen.getByLabelText('Cook Time (minutes)')).toBeInTheDocument()
      expect(screen.getByLabelText('Servings')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Tags')).toBeInTheDocument()
      expect(screen.getByLabelText('Recipe Source')).toBeInTheDocument()
      expect(screen.getByLabelText('Make this recipe public')).toBeInTheDocument()
    })
  })

  it('fetches and displays categories', async () => {
    renderWithProvider()
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/categories')
    })
    
    // Open category dropdown
    fireEvent.click(screen.getByRole('combobox'))
    
    await waitFor(() => {
      expect(screen.getByText('Breakfast')).toBeInTheDocument()
      expect(screen.getByText('Lunch')).toBeInTheDocument()
      expect(screen.getByText('Dinner')).toBeInTheDocument()
    })
  })

  it('updates title field', () => {
    renderWithProvider()
    
    const titleInput = screen.getByLabelText('Recipe Title *')
    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } })
    
    expect(titleInput).toHaveValue('Test Recipe')
  })

  it('updates description field', () => {
    renderWithProvider()
    
    const descriptionInput = screen.getByLabelText('Description')
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } })
    
    expect(descriptionInput).toHaveValue('Test description')
  })

  it('updates numeric fields', () => {
    renderWithProvider()
    
    const prepTimeInput = screen.getByLabelText('Prep Time (minutes)')
    const cookTimeInput = screen.getByLabelText('Cook Time (minutes)')
    const servingsInput = screen.getByLabelText('Servings')
    
    fireEvent.change(prepTimeInput, { target: { value: '15' } })
    fireEvent.change(cookTimeInput, { target: { value: '30' } })
    fireEvent.change(servingsInput, { target: { value: '4' } })
    
    expect(prepTimeInput).toHaveValue(15)
    expect(cookTimeInput).toHaveValue(30)
    expect(servingsInput).toHaveValue(4)
  })

  it('handles tags input correctly', () => {
    renderWithProvider()
    
    const tagsInput = screen.getByLabelText('Tags')
    fireEvent.change(tagsInput, { target: { value: 'quick, easy, vegetarian' } })
    
    expect(tagsInput).toHaveValue('quick, easy, vegetarian')
  })

  it('updates source name', () => {
    renderWithProvider()
    
    const sourceInput = screen.getByLabelText('Recipe Source')
    fireEvent.change(sourceInput, { target: { value: 'Grandma Rose' } })
    
    expect(sourceInput).toHaveValue('Grandma Rose')
  })

  it('toggles public switch', () => {
    renderWithProvider()
    
    const publicSwitch = screen.getByLabelText('Make this recipe public')
    fireEvent.click(publicSwitch)
    
    expect(publicSwitch).toBeChecked()
  })

  it('handles category selection', async () => {
    renderWithProvider()
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/categories')
    })
    
    // Open dropdown
    fireEvent.click(screen.getByRole('combobox'))
    
    // Select category
    await waitFor(() => {
      fireEvent.click(screen.getByText('Breakfast'))
    })
    
    expect(screen.getByRole('combobox')).toHaveTextContent('Breakfast')
  })

  it.skip('handles category fetch error gracefully', async () => {
    vi.clearAllMocks()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))
    
    renderWithProvider()
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/categories')
    })
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching categories:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  it('clears numeric fields when empty', () => {
    renderWithProvider()
    
    const prepTimeInput = screen.getByLabelText('Prep Time (minutes)')
    
    // Set value
    fireEvent.change(prepTimeInput, { target: { value: '15' } })
    expect(prepTimeInput).toHaveValue(15)
    
    // Clear value
    fireEvent.change(prepTimeInput, { target: { value: '' } })
    expect(prepTimeInput).toHaveValue(null)
  })
})