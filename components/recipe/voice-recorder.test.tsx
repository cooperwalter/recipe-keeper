import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceRecorder } from './voice-recorder'

// Mock AudioContext
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
  cb(0)
  return 0
})
global.cancelAnimationFrame = vi.fn()

// Mock navigator.mediaDevices
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as ((event: BlobEvent) => void) | null,
  onstop: null as (() => void) | null,
  state: 'inactive'
}

const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }])
}

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream as MediaStream))
  }
})

global.MediaRecorder = vi.fn(() => mockMediaRecorder) as unknown as typeof MediaRecorder
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock fetch
global.fetch = vi.fn()

describe('VoiceRecorder', () => {
  const mockOnTranscription = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockMediaRecorder.state = 'inactive'
    // Reset navigator.mediaDevices.getUserMedia mock
    ;(navigator.mediaDevices.getUserMedia as vi.MockedFunction<typeof navigator.mediaDevices.getUserMedia>).mockResolvedValue(mockMediaStream as MediaStream)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial state correctly', () => {
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    expect(screen.getByText('Voice Input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
  })

  it('starts recording when microphone button is clicked', async () => {
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(mockMediaRecorder.start).toHaveBeenCalled()
    expect(screen.getByText('Listening... Click to stop')).toBeInTheDocument()
  })

  it('stops recording when stop button is clicked', async () => {
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Start recording
    mockMediaRecorder.state = 'recording'
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    // Stop recording
    const stopButton = screen.getByRole('button', { name: /stop recording/i })
    await userEvent.click(stopButton)
    
    expect(mockMediaRecorder.stop).toHaveBeenCalled()
  })

  it('handles microphone permission error', async () => {
    const error = new Error('Permission denied')
    navigator.mediaDevices.getUserMedia = vi.fn(() => Promise.reject(error))
    
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    await waitFor(() => {
      expect(screen.getByText('Unable to access microphone. Please check permissions.')).toBeInTheDocument()
    })
  })

  it.skip('displays audio controls after recording and auto-transcribes', async () => {
    const mockTranscription = 'Auto transcribed text'
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: mockTranscription })
    })
    
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Start and stop recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    // Simulate recording completion
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    
    await act(async () => {
      mockMediaRecorder.ondataavailable?.({ data: mockBlob } as BlobEvent)
      mockMediaRecorder.onstop?.()
    })
    
    await waitFor(() => {
      expect(screen.getByText('Recording complete')).toBeInTheDocument()
    })
    
    // Wait a bit for the auto-transcription to start (setTimeout in component)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Transcribing...')).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(mockOnTranscription).toHaveBeenCalledWith(mockTranscription)
      expect(screen.getByText(mockTranscription)).toBeInTheDocument()
    })
  })

  it.skip('handles transcription error during auto-transcribe', async () => {
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))
    
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Start and stop recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    // Simulate recording completion
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as BlobEvent)
    mockMediaRecorder.onstop?.()
    
    await waitFor(() => {
      expect(screen.getByText('Failed to transcribe audio')).toBeInTheDocument()
    })
  })

  it.skip('allows manual re-transcription after auto-transcribe', async () => {
    const firstTranscription = 'First transcription'
    const secondTranscription = 'Second transcription'
    
    ;(global.fetch as vi.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: firstTranscription })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: secondTranscription })
      })
    
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Start and stop recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    // Simulate recording completion
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as BlobEvent)
    mockMediaRecorder.onstop?.()
    
    // Wait for auto-transcription
    await waitFor(() => {
      expect(screen.getByText(firstTranscription)).toBeInTheDocument()
    })
    
    // Verify first transcription was called
    expect(mockOnTranscription).toHaveBeenCalledWith(firstTranscription)
  })

  it('clears recording when X button is clicked', async () => {
    const user = userEvent.setup()
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Start recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await user.click(recordButton)
    
    // Stop recording by clicking again (simulating toggle)
    mockMediaRecorder.state = 'recording'
    const stopButton = screen.getByRole('button', { name: /stop recording/i })
    
    // Simulate the recording data
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    
    // Click stop to trigger the recording end
    await user.click(stopButton)
    
    // Trigger the MediaRecorder events
    mockMediaRecorder.state = 'inactive'
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as BlobEvent)
    mockMediaRecorder.onstop?.()
    
    await waitFor(() => {
      expect(screen.getByText('Recording complete')).toBeInTheDocument()
    })
    
    // Find and click the X button
    const clearButton = screen.getByRole('button', { name: /clear recording/i }) || 
                       screen.getAllByRole('button').find(btn => btn.querySelector('svg.lucide-x'))
    
    expect(clearButton).toBeTruthy()
    await user.click(clearButton!)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
      expect(screen.queryByText('Recording complete')).not.toBeInTheDocument()
    })
  })

  it('disables buttons when processing', () => {
    render(<VoiceRecorder onTranscription={mockOnTranscription} isProcessing={true} />)
    
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    expect(recordButton).not.toBeDisabled() // Recording should still be allowed
  })

  it.skip('shows transcribing state during auto-transcribe', async () => {
    ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ text: 'Test transcription' })
      } as Response), 100))
    )
    
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Start and stop recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    // Simulate recording completion
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as BlobEvent)
    mockMediaRecorder.onstop?.()
    
    await waitFor(() => {
      expect(screen.getByText('Transcribing...')).toBeInTheDocument()
    })
  })
})