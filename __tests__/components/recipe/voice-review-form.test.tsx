import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoiceReviewForm } from '@/components/recipe/voice-review-form'

// Mock fetch
global.fetch = vi.fn()

describe('VoiceReviewForm', () => {
  const mockOnRecipeCreated = vi.fn()
  const mockOnBack = vi.fn()
  
  const defaultProps = {
    extractedData: {
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: [
        { ingredient: 'flour', amount: '2', unit: 'cups' },
        { ingredient: 'sugar', amount: '1', unit: 'cup' }
      ],
      instructions: ['Mix ingredients', 'Bake for 20 minutes'],
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      sourceName: 'Test User',
      sourceNotes: 'Family favorite'
    },
    transcript: 'This is the original transcript',
    onRecipeCreated: mockOnRecipeCreated,
    onBack: mockOnBack
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
  })

  it('should render form with extracted data', () => {
    render(<VoiceReviewForm {...defaultProps} />)
    
    expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A test recipe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('flour')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('cups')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mix ingredients')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('20')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    expect(screen.getByText('This is the original transcript')).toBeInTheDocument()
  })

  it('should allow editing fields', () => {
    render(<VoiceReviewForm {...defaultProps} />)
    
    const titleInput = screen.getByDisplayValue('Test Recipe')
    fireEvent.change(titleInput, { target: { value: 'Updated Recipe' } })
    
    expect(screen.getByDisplayValue('Updated Recipe')).toBeInTheDocument()
  })

  it('should add new ingredient', () => {
    render(<VoiceReviewForm {...defaultProps} />)
    
    const addButton = screen.getByRole('button', { name: /add ingredient/i })
    fireEvent.click(addButton)
    
    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
    expect(ingredientInputs).toHaveLength(3)
  })

  it('should remove ingredient', () => {
    render(<VoiceReviewForm {...defaultProps} />)
    
    // Find X buttons by their icon class instead of aria-label
    const removeButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('.lucide-x') !== null
    )
    fireEvent.click(removeButtons[0])
    
    expect(screen.queryByDisplayValue('flour')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('sugar')).toBeInTheDocument()
  })

  it('should add new instruction', () => {
    render(<VoiceReviewForm {...defaultProps} />)
    
    const addButton = screen.getByRole('button', { name: /add step/i })
    fireEvent.click(addButton)
    
    const instructionInputs = screen.getAllByPlaceholderText('Instruction *')
    expect(instructionInputs).toHaveLength(3)
  })

  it('should move instruction up/down', () => {
    render(<VoiceReviewForm {...defaultProps} />)
    
    // Find the grip handles (move buttons)
    const moveButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('.lucide-grip-vertical') !== null
    )
    
    // Move second instruction up
    fireEvent.click(moveButtons[1])
    
    const instructions = screen.getAllByPlaceholderText('Instruction *')
    expect(instructions[0]).toHaveValue('Bake for 20 minutes')
    expect(instructions[1]).toHaveValue('Mix ingredients')
  })

  it('should submit recipe successfully', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-recipe-id' })
    } as Response)
    
    render(<VoiceReviewForm {...defaultProps} />)
    
    const saveButton = screen.getByRole('button', { name: /save recipe/i })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"title":"Test Recipe"')
      })
      expect(mockOnRecipeCreated).toHaveBeenCalledWith('new-recipe-id')
    })
  })

  it('should handle submission errors', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to save' })
    } as Response)
    
    render(<VoiceReviewForm {...defaultProps} />)
    
    const saveButton = screen.getByRole('button', { name: /save recipe/i })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeInTheDocument()
    })
  })


  it('should handle back button', () => {
    render(<VoiceReviewForm {...defaultProps} />)
    
    const backButton = screen.getAllByRole('button', { name: /back/i })[0]
    fireEvent.click(backButton)
    
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('should handle cancel button', () => {
    render(<VoiceReviewForm {...defaultProps} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)
    
    expect(mockOnBack).toHaveBeenCalled()
  })
})