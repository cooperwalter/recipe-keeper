import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceToRecipe } from './voice-to-recipe'

// Mock child components
vi.mock('./voice-recorder', () => ({
  VoiceRecorder: ({ onTranscription }: any) => (
    <div data-testid="voice-recorder">
      <button 
        onClick={() => onTranscription('Add more flour')}
        data-testid="mock-transcribe"
      >
        Mock Transcribe
      </button>
    </div>
  )
}))

vi.mock('./voice-change-review', () => ({
  VoiceChangeReview: ({ changes, onApprove, onCancel }: any) => (
    <div data-testid="voice-change-review">
      <div data-testid="changes-count">{changes.length} changes</div>
      <button onClick={() => onApprove(changes)} data-testid="approve-changes">
        Approve
      </button>
      <button onClick={onCancel} data-testid="cancel-changes">
        Cancel
      </button>
    </div>
  )
}))

// Mock fetch
global.fetch = vi.fn()

const mockRecipe = {
  id: 'test-recipe-id',
  title: 'Test Recipe',
  description: 'A test recipe',
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  sourceName: 'Test Source',
  sourceNotes: 'Test notes',
  ingredients: [
    { id: '1', ingredient: 'flour', amount: '2', unit: 'cups', notes: null, orderIndex: 0 }
  ],
  instructions: [
    { id: '1', stepNumber: 1, instruction: 'Mix ingredients' }
  ],
  tags: ['test'],
  photos: [],
  categories: [],
  isFavorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'test-user'
}

describe('VoiceToRecipe', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders talk to recipe button', () => {
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    expect(screen.getByRole('button', { name: /talk to recipe/i })).toBeInTheDocument()
  })

  it('opens dialog when button is clicked', async () => {
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    const button = screen.getByRole('button', { name: /talk to recipe/i })
    await userEvent.click(button)
    
    expect(screen.getByText('Talk to Your Recipe')).toBeInTheDocument()
    expect(screen.getByTestId('voice-recorder')).toBeInTheDocument()
  })

  it('shows example commands', async () => {
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    
    expect(screen.getByText(/Add more flour, about half a cup/)).toBeInTheDocument()
    expect(screen.getByText(/Change the baking time to 25 minutes/)).toBeInTheDocument()
    expect(screen.getByText(/Remove the vanilla extract/)).toBeInTheDocument()
    expect(screen.getByText(/Add a note about room temperature eggs/)).toBeInTheDocument()
  })

  it('processes voice transcription', async () => {
    const mockChanges = [
      {
        type: 'modify',
        field: 'ingredients',
        oldValue: { ingredient: 'flour', amount: '2', unit: 'cups' },
        newValue: { ingredient: 'flour', amount: '2.5', unit: 'cups' },
        details: 'Adding more flour'
      }
    ]
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mockChanges })
    })
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    
    const transcribeButton = screen.getByTestId('mock-transcribe')
    await userEvent.click(transcribeButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
      expect(screen.getByTestId('changes-count')).toHaveTextContent('1 changes')
    })
  })

  it('handles transcription errors', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    
    const transcribeButton = screen.getByTestId('mock-transcribe')
    await userEvent.click(transcribeButton)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to understand the command. Please try again.')).toBeInTheDocument()
    })
  })

  it('applies approved changes', async () => {
    const mockChanges = [
      {
        type: 'modify',
        field: 'cookTime',
        oldValue: 20,
        newValue: 25,
        details: 'Increasing cook time'
      }
    ]
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mockChanges })
    })
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    await userEvent.click(screen.getByTestId('mock-transcribe'))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
    })
    
    await userEvent.click(screen.getByTestId('approve-changes'))
    
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
        cookTime: 25
      }))
    })
  })

  it('handles complex ingredient changes', async () => {
    const mockChanges = [
      {
        type: 'add',
        field: 'ingredients',
        newValue: { ingredient: 'vanilla extract', amount: '1', unit: 'tsp' }
      },
      {
        type: 'remove',
        field: 'ingredients',
        oldValue: { ingredient: 'flour', amount: '2', unit: 'cups' }
      }
    ]
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mockChanges })
    })
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    await userEvent.click(screen.getByTestId('mock-transcribe'))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
    })
    
    await userEvent.click(screen.getByTestId('approve-changes'))
    
    await waitFor(() => {
      const call = mockOnUpdate.mock.calls[0][0]
      expect(call.ingredients).toHaveLength(1)
      expect(call.ingredients[0].ingredient).toBe('vanilla extract')
    })
  })

  it('handles instruction changes with renumbering', async () => {
    const mockChanges = [
      {
        type: 'add',
        field: 'instructions',
        newValue: { instruction: 'Preheat oven' }
      }
    ]
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mockChanges })
    })
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    await userEvent.click(screen.getByTestId('mock-transcribe'))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
    })
    
    await userEvent.click(screen.getByTestId('approve-changes'))
    
    await waitFor(() => {
      const call = mockOnUpdate.mock.calls[0][0]
      expect(call.instructions).toHaveLength(2)
      expect(call.instructions[0].stepNumber).toBe(1)
      expect(call.instructions[1].stepNumber).toBe(2)
    })
  })

  it('cancels changes when cancel is clicked', async () => {
    const mockChanges = [
      {
        type: 'modify',
        field: 'title',
        oldValue: 'Test Recipe',
        newValue: 'Updated Recipe'
      }
    ]
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mockChanges })
    })
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    await userEvent.click(screen.getByTestId('mock-transcribe'))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
    })
    
    await userEvent.click(screen.getByTestId('cancel-changes'))
    
    expect(mockOnUpdate).not.toHaveBeenCalled()
    expect(screen.queryByTestId('voice-change-review')).not.toBeInTheDocument()
  })

  it('closes dialog after successful update', async () => {
    const mockChanges = [
      {
        type: 'modify',
        field: 'servings',
        oldValue: 4,
        newValue: 6
      }
    ]
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mockChanges })
    })
    
    mockOnUpdate.mockResolvedValueOnce(undefined)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    await userEvent.click(screen.getByTestId('mock-transcribe'))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
    })
    
    await userEvent.click(screen.getByTestId('approve-changes'))
    
    await waitFor(() => {
      expect(screen.queryByText('Talk to Your Recipe')).not.toBeInTheDocument()
    })
  })

  it('handles update errors gracefully', async () => {
    const mockChanges = [
      {
        type: 'modify',
        field: 'title',
        oldValue: 'Test Recipe',
        newValue: 'Updated Recipe'
      }
    ]
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mockChanges })
    })
    
    mockOnUpdate.mockRejectedValueOnce(new Error('Update failed'))
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    await userEvent.click(screen.getByTestId('mock-transcribe'))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
    })
    
    await userEvent.click(screen.getByTestId('approve-changes'))
    
    await waitFor(() => {
      expect(screen.getByText('Failed to apply changes. Please try again.')).toBeInTheDocument()
    })
  })

  it('handles empty changes response', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: [] })
    })
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    await userEvent.click(screen.getByTestId('mock-transcribe'))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
      expect(screen.getByTestId('changes-count')).toHaveTextContent('0 changes')
    })
  })

  it('handles tag modifications', async () => {
    const mockChanges = [
      {
        type: 'add',
        field: 'tags',
        newValue: 'vegetarian'
      }
    ]
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mockChanges })
    })
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /talk to recipe/i }))
    await userEvent.click(screen.getByTestId('mock-transcribe'))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
    })
    
    await userEvent.click(screen.getByTestId('approve-changes'))
    
    await waitFor(() => {
      const call = mockOnUpdate.mock.calls[0][0]
      expect(call.tags).toContain('vegetarian')
      expect(call.tags).toContain('test') // Original tag preserved
    })
  })
})