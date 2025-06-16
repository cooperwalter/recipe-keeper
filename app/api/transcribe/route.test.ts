import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('POST /api/transcribe', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn()
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  it('returns 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const formData = new FormData()
    formData.append('audio', new Blob(['audio data'], { type: 'audio/webm' }), 'recording.webm')
    
    const request = new NextRequest('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 if no audio file is provided', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })

    const formData = new FormData()
    
    const request = new NextRequest('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No audio file provided')
  })

  it('successfully returns mock transcription', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })

    const formData = new FormData()
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    formData.append('audio', audioBlob, 'recording.webm')
    
    const request = new NextRequest('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('text')
    expect(typeof data.text).toBe('string')
    expect(data.text.length).toBeGreaterThan(0)
  })

  it('returns one of the mock transcriptions', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })

    const mockTranscriptions = [
      "Add half a cup more flour to make it thicker",
      "Change the baking time to 25 minutes instead of 20",
      "Add a teaspoon of vanilla extract to the ingredients",
      "Replace the sugar with honey, about three quarters of a cup",
      "Add a note that this works best with room temperature eggs"
    ]

    const formData = new FormData()
    formData.append('audio', new Blob(['audio data'], { type: 'audio/webm' }), 'recording.webm')
    
    const request = new NextRequest('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(mockTranscriptions).toContain(data.text)
  })

  it('handles different audio file types', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })

    const audioTypes = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg']
    
    for (const mimeType of audioTypes) {
      const formData = new FormData()
      const audioBlob = new Blob(['audio data'], { type: mimeType })
      formData.append('audio', audioBlob, `recording.${mimeType.split('/')[1]}`)
      
      const request = new NextRequest('http://localhost/api/transcribe', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('text')
    }
  })

  it('handles large audio files', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })

    // Create a 5MB audio file
    const largeAudioData = new Uint8Array(5 * 1024 * 1024)
    const formData = new FormData()
    formData.append('audio', new Blob([largeAudioData], { type: 'audio/webm' }), 'recording.webm')
    
    const request = new NextRequest('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('text')
  })

  it('handles errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } } 
    })

    // Mock FormData to throw an error
    const request = new NextRequest('http://localhost/api/transcribe', {
      method: 'POST',
      body: null as any
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to transcribe audio')
  })
})