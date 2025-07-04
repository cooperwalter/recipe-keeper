import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('[Transcribe API] Processing transcription request')
    
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Transcribe API] Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[Transcribe API] Authenticated user:', user.email)

    // Get the audio file from the request
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY
    console.log('[Transcribe API] OpenAI API key status:', {
      exists: !!openaiApiKey,
      length: openaiApiKey?.length || 0,
      prefix: openaiApiKey?.substring(0, 10) || 'N/A',
      suffix: openaiApiKey ? '...' + openaiApiKey.slice(-4) : 'N/A',
      nodeEnv: process.env.NODE_ENV,
      isDemoUser: user.email === 'demo@recipeinheritancekeeper.com'
    })
    
    if (!openaiApiKey) {
      // In development/demo mode, return mock transcription
      if (process.env.NODE_ENV === 'development' || user.email === 'demo@recipeinheritancekeeper.com') {
        console.warn('[Transcribe API] OpenAI API key not found. Using mock transcription.')
        
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
    console.log('[Transcribe API] Preparing file for Whisper API:', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type
    })
    
    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile)
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('language', 'en')

    console.log('[Transcribe API] Sending request to OpenAI Whisper API...')
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: whisperFormData,
    })

    console.log('[Transcribe API] OpenAI API response status:', response.status, response.statusText)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('[Transcribe API] OpenAI Whisper API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: error,
        headers: Object.fromEntries(response.headers.entries())
      })
      throw new Error(`Transcription service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json()
    const text = data.text?.trim()

    if (!text) {
      throw new Error('No transcription text received')
    }
    
    console.log('[Transcribe API] Successfully transcribed audio, text length:', text.length)
    return NextResponse.json({ text })
  } catch (error) {
    console.error('[Transcribe API] Error details:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      } : error,
      errorType: typeof error,
      errorString: String(error)
    })
    
    return NextResponse.json(
      { error: 'Failed to transcribe audio. Check server logs for details.' },
      { status: 500 }
    )
  }
}