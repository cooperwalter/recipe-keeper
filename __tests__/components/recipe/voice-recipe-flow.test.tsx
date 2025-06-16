import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { VoiceRecipeFlow } from '@/components/recipe/voice-recipe-flow'
import { useRouter } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

// Mock AudioContext and related APIs
const mockAnalyser = {
  connect: vi.fn(),
  fftSize: 256,
  frequencyBinCount: 128,
  getByteFrequencyData: vi.fn((array: Uint8Array) => {
    // Fill with mock data
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 255)
    }
  })
}

const mockAudioContext = {
  createAnalyser: vi.fn(() => mockAnalyser),
  createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
  close: vi.fn(() => Promise.resolve()),
  state: 'running'
}

global.AudioContext = vi.fn(() => mockAudioContext) as unknown as typeof AudioContext
global.requestAnimationFrame = vi.fn((cb) => {
  // Don't call immediately to avoid infinite loop
  setTimeout(() => cb(0), 16)
  return 0
})
global.cancelAnimationFrame = vi.fn()

// Mock navigator.mediaDevices
const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }])
}

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream as MediaStream))
  }
})

// Mock fetch
global.fetch = vi.fn()

// Mock SpeechRecognition
const mockStart = vi.fn()
const mockStop = vi.fn()
let mockOnResult: any
let mockOnError: any

class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  
  start = mockStart
  stop = mockStop
  
  set onresult(handler: any) {
    mockOnResult = handler
  }
  
  set onerror(handler: any) {
    mockOnError = handler
  }
}

// Setup global mocks before importing component
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition
})

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition
})

describe('VoiceRecipeFlow', () => {
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    mockStart.mockClear()
    mockStop.mockClear()
  })

  it('should render recording interface', () => {
    render(<VoiceRecipeFlow />)
    
    expect(screen.getByText('Speak Your Recipe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
    expect(screen.getByText(/Tips for Speaking Recipes/)).toBeInTheDocument()
  })

  it('should start recording when microphone button is clicked', async () => {
    render(<VoiceRecipeFlow />)
    
    const micButton = screen.getByRole('button', { name: /start recording/i })
    fireEvent.click(micButton)
    
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled()
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })
  })

  it('should display transcript as user speaks', async () => {
    render(<VoiceRecipeFlow />)
    
    // Start recording
    const micButton = screen.getByRole('button', { name: /start recording/i })
    
    await act(async () => {
      fireEvent.click(micButton)
    })
    
    // Simulate speech recognition result
    await act(async () => {
      mockOnResult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'This is my test recipe' },
          isFinal: true
        }]
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('What we heard:')).toBeInTheDocument()
      expect(screen.getByText(/This is my test recipe/)).toBeInTheDocument()
    })
  })

  it('should stop recording when stop button is clicked', async () => {
    render(<VoiceRecipeFlow />)
    
    // Start recording
    const micButton = screen.getByRole('button', { name: /start recording/i })
    fireEvent.click(micButton)
    
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })
    
    // Stop recording
    fireEvent.click(micButton)
    
    expect(mockStop).toHaveBeenCalled()
  })

  it('should process voice input and show review form', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recipe: {
          title: 'Test Recipe',
          ingredients: [{ ingredient: 'flour', amount: '2', unit: 'cups' }],
          instructions: ['Mix ingredients', 'Bake for 20 minutes']
        },
        transcript: 'test transcript'
      })
    } as Response)
    
    render(<VoiceRecipeFlow />)
    
    // Start and stop recording
    const micButton = screen.getByRole('button', { name: /start recording/i })
    
    await act(async () => {
      fireEvent.click(micButton)
    })
    
    // Add transcript
    await act(async () => {
      mockOnResult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Test recipe transcript' },
          isFinal: true
        }]
      })
    })
    
    await act(async () => {
      fireEvent.click(micButton) // Stop
    })
    
    // Click continue
    await waitFor(() => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeInTheDocument()
    })
    
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await act(async () => {
      fireEvent.click(continueButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Review Your Recipe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument()
    })
  })

  it('should handle speech recognition errors', async () => {
    render(<VoiceRecipeFlow />)
    
    // Start recording
    const micButton = screen.getByRole('button', { name: /start recording/i })
    
    await act(async () => {
      fireEvent.click(micButton)
    })
    
    // Simulate error
    await act(async () => {
      mockOnError({ error: 'no-speech' })
    })
    
    await waitFor(() => {
      expect(screen.getByText('No speech detected. Please try again.')).toBeInTheDocument()
      expect(mockStop).toHaveBeenCalled()
    })
  })

  it('should handle API errors', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Processing failed' })
    } as Response)
    
    render(<VoiceRecipeFlow />)
    
    // Add transcript and process
    const micButton = screen.getByRole('button', { name: /start recording/i })
    
    await act(async () => {
      fireEvent.click(micButton)
    })
    
    await act(async () => {
      mockOnResult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Test recipe' },
          isFinal: true
        }]
      })
    })
    
    await act(async () => {
      fireEvent.click(micButton) // Stop
    })
    
    await waitFor(() => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeInTheDocument()
    })
    
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await act(async () => {
      fireEvent.click(continueButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Processing failed')).toBeInTheDocument()
    })
  })

  it('should allow starting over', async () => {
    render(<VoiceRecipeFlow />)
    
    // Add transcript
    const micButton = screen.getByRole('button', { name: /start recording/i })
    
    await act(async () => {
      fireEvent.click(micButton)
    })
    
    await act(async () => {
      mockOnResult({
        resultIndex: 0,
        results: [{
          0: { transcript: 'Test recipe' },
          isFinal: true
        }]
      })
    })
    
    await act(async () => {
      fireEvent.click(micButton) // Stop
    })
    
    // Click start over
    await waitFor(() => {
      const startOverButton = screen.getByRole('button', { name: /start over/i })
      expect(startOverButton).toBeInTheDocument()
    })
    
    const startOverButton = screen.getByRole('button', { name: /start over/i })
    await act(async () => {
      fireEvent.click(startOverButton)
    })
    
    expect(screen.queryByText(/Test recipe/)).not.toBeInTheDocument()
  })

  it('should display recording timer', async () => {
    render(<VoiceRecipeFlow />)
    
    const micButton = screen.getByRole('button', { name: /start recording/i })
    fireEvent.click(micButton)
    
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
      // Timer should start at 0:00
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })
  })
})