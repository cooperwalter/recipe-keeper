import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the audio file from the request
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY
    
    if (!openaiApiKey) {
      // In development/demo mode, return mock transcription
      if (process.env.NODE_ENV === 'development' || user.email === 'demo@recipeinheritancekeeper.com') {
        console.warn('OpenAI API key not found. Using mock transcription.')
        
        const mockTranscriptions = [
          "Add half a cup more flour to make it thicker",
          "Change the baking time to 25 minutes instead of 20",
          "Add a teaspoon of vanilla extract to the ingredients",
          "Replace the sugar with honey, about three quarters of a cup",
          "Add a note that this works best with room temperature eggs"
        ]
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Return a random mock transcription for demo
        const text = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)]
        
        return NextResponse.json({ text })
      }
      
      // In production for real users, return an error
      return NextResponse.json(
        { error: 'Voice transcription is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // Use OpenAI Whisper API for transcription
    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile)
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: whisperFormData,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI Whisper API error:', error)
      throw new Error('Transcription service error')
    }

    const data = await response.json()
    const text = data.text?.trim()

    if (!text) {
      throw new Error('No transcription text received')
    }
    
    return NextResponse.json({ text })
  } catch (error) {
    console.error('Error transcribing audio:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}