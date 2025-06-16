import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceRecorder } from './voice-recorder'

// Mock navigator.mediaDevices
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  state: 'inactive'
}

const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }])
}

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream as any))
  }
})

global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any
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
    ;(navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockMediaStream)
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
    expect(screen.getByText('Recording... Click to stop')).toBeInTheDocument()
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

  it('displays audio controls after recording', async () => {
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Start and stop recording
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    // Simulate recording completion
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any)
    mockMediaRecorder.onstop?.()
    
    await waitFor(() => {
      expect(screen.getByText('Recording complete')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeInTheDocument()
    })
  })

  it('transcribes audio successfully', async () => {
    const mockTranscription = 'Add more flour to the recipe'
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: mockTranscription })
    })
    
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Simulate having recorded audio
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any)
    mockMediaRecorder.onstop?.()
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeInTheDocument()
    })
    
    const transcribeButton = screen.getByRole('button', { name: /transcribe audio/i })
    await userEvent.click(transcribeButton)
    
    await waitFor(() => {
      expect(mockOnTranscription).toHaveBeenCalledWith(mockTranscription)
      expect(screen.getByText(mockTranscription)).toBeInTheDocument()
    })
  })

  it('handles transcription error', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))
    
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Simulate having recorded audio
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any)
    mockMediaRecorder.onstop?.()
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeInTheDocument()
    })
    
    const transcribeButton = screen.getByRole('button', { name: /transcribe audio/i })
    await userEvent.click(transcribeButton)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to transcribe audio. Please try again.')).toBeInTheDocument()
    })
  })

  it('clears recording when X button is clicked', async () => {
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Simulate having recorded audio
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    // Simulate stopping the recording
    mockMediaRecorder.state = 'inactive'
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any)
    mockMediaRecorder.onstop?.()
    
    await waitFor(() => {
      expect(screen.getByText('Recording complete')).toBeInTheDocument()
    })
    
    // Find the X button - it should have an X icon
    const buttons = screen.getAllByRole('button')
    const clearButton = buttons.find(btn => {
      const svg = btn.querySelector('svg.lucide-x')
      return svg !== null
    })
    
    expect(clearButton).toBeDefined()
    await userEvent.click(clearButton!)
    
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

  it('shows transcribing state', async () => {
    ;(global.fetch as any).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ text: 'Test transcription' })
      }), 100))
    )
    
    render(<VoiceRecorder onTranscription={mockOnTranscription} />)
    
    // Simulate having recorded audio
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await userEvent.click(recordButton)
    
    mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any)
    mockMediaRecorder.onstop?.()
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeInTheDocument()
    })
    
    const transcribeButton = screen.getByRole('button', { name: /transcribe audio/i })
    await userEvent.click(transcribeButton)
    
    expect(screen.getByText('Transcribing...')).toBeInTheDocument()
  })
})