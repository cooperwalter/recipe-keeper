import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceToRecipe } from './voice-to-recipe'

// Mock components
vi.mock('./voice-change-review', () => ({
  VoiceChangeReview: ({ changes, onApprove, onCancel }: { changes: unknown[]; onApprove: (changes: unknown[]) => void; onCancel: () => void }) => (
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

vi.mock('@/components/ui/voice-wave-animation', () => ({
  VoiceWaveAnimation: () => <div data-testid="voice-wave-animation" />
}))

// Mock MediaDevices API
const mockMediaStream = {
  getTracks: () => [{
    stop: vi.fn()
  }]
}

const mockAnalyserNode = {
  fftSize: 2048,
  frequencyBinCount: 1024,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  getByteTimeDomainData: vi.fn(),
  getByteFrequencyData: vi.fn()
}

const mockAudioContext = {
  createAnalyser: () => mockAnalyserNode,
  createMediaStreamSource: () => ({ connect: vi.fn() }),
  close: vi.fn(),
  state: 'running'
}

// Mock Speech Recognition
const mockSpeechRecognitionInstance = {
  continuous: false,
  interimResults: false,
  lang: '',
  onresult: null,
  onerror: null,
  start: vi.fn(),
  stop: vi.fn()
}

const MockSpeechRecognition = vi.fn(() => mockSpeechRecognitionInstance)

// Setup global mocks
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue(mockMediaStream)
  }
} as Navigator

global.AudioContext = vi.fn(() => mockAudioContext) as unknown as typeof AudioContext
(window as Window & typeof globalThis & { SpeechRecognition?: unknown }).SpeechRecognition = MockSpeechRecognition
(window as Window & typeof globalThis & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = MockSpeechRecognition

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
    { id: '1', recipeId: 'test-recipe-id', ingredient: 'flour', amount: 2, unit: 'cups', notes: null, orderIndex: 0, createdAt: new Date().toISOString() }
  ],
  instructions: [
    { id: '1', recipeId: 'test-recipe-id', stepNumber: 1, instruction: 'Mix ingredients', createdAt: new Date().toISOString() }
  ],
  tags: ['test'],
  photos: [],
  categories: [],
  isFavorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'test-user',
  isPublic: false,
  version: 1
}

describe('VoiceToRecipe', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockAudioContext.state = 'running'
  })

  it('renders talk to recipe button', () => {
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    expect(screen.getByRole('button', { name: /speak to edit/i })).toBeInTheDocument()
  })

  it('opens dialog when button is clicked', async () => {
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    const button = screen.getByRole('button', { name: /speak to edit/i })
    await userEvent.click(button)
    
    expect(screen.getByText('Talk to Your Recipe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
  })

  it('shows example commands', async () => {
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
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
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: mockChanges })
    } as unknown as Response)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    // Start recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    // Simulate speech recognition result
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
          resultIndex: 0,
          results: [{
            0: { transcript: 'Add more flour' },
            isFinal: true,
            length: 1
          }]
        })
      }
    })
    
    // Stop recording
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
    // Wait for automatic processing
    await waitFor(() => {
      expect(screen.getByText(/Processing will start automatically/)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
      expect(screen.getByTestId('changes-count')).toHaveTextContent('1 changes')
    })
  })

  it('handles transcription errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    // Set transcript directly for testing
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Add more flour' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
    // Wait for automatic processing and error
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
    
    consoleSpy.mockRestore()
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
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: mockChanges })
    } as unknown as Response)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    // Start and simulate recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Change cook time to 25 minutes' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
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
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: mockChanges })
    } as unknown as Response)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    // Simulate recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Add vanilla extract and remove flour' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
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
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: mockChanges })
    } as unknown as Response)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Add step to preheat oven' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
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
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: mockChanges })
    } as unknown as Response)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Change title to Updated Recipe' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
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
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: mockChanges })
    } as unknown as Response)
    
    mockOnUpdate.mockResolvedValueOnce(undefined)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Change servings to 6' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
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
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: mockChanges })
    } as unknown as Response)
    
    mockOnUpdate.mockRejectedValueOnce(new Error('Update failed'))
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Change title' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
    await waitFor(() => {
      expect(screen.getByTestId('voice-change-review')).toBeInTheDocument()
    })
    
    await userEvent.click(screen.getByTestId('approve-changes'))
    
    await waitFor(() => {
      // The error should be shown within the dialog content
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Failed to apply changes. Please try again.')).toBeInTheDocument()
    })
  })

  it('handles empty changes response', async () => {
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: [] })
    } as unknown as Response)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Some text' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/couldn't understand what changes you want to make/)).toBeInTheDocument()
    })
  })

  it.skip('handles tag modifications', async () => {
    const mockChanges = [
      {
        type: 'add',
        field: 'tags',
        newValue: 'vegetarian'
      }
    ]
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ changes: mockChanges })
    } as unknown as Response)
    
    render(<VoiceToRecipe recipe={mockRecipe} onUpdate={mockOnUpdate} />)
    
    await userEvent.click(screen.getByRole('button', { name: /speak to edit/i }))
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await act(async () => {
      if (mockSpeechRecognitionInstance.onresult) {
        mockSpeechRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Add vegetarian tag' },
          isFinal: true,
          length: 1
        }]
        })
      }
    })
    
    await userEvent.click(screen.getByRole('button', { name: /stop recording/i }))
    
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