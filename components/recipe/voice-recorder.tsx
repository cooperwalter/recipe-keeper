'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mic, MicOff, Loader2, Volume2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onTranscription: (text: string) => void
  isProcessing?: boolean
  className?: string
}

export function VoiceRecorder({ onTranscription, isProcessing = false, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
        
        // Automatically start transcription after recording stops
        setTimeout(() => {
          transcribeAudioInternal(blob)
        }, 100)
      }
      
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Unable to access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudioInternal = async (blob: Blob) => {
    setIsTranscribing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed')
      }

      const { text } = data
      setTranscription(text)
      onTranscription(text)
    } catch (err) {
      console.error('Error transcribing audio:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to transcribe audio'
      setError(errorMessage)
    } finally {
      setIsTranscribing(false)
    }
  }


  const clearRecording = () => {
    setAudioBlob(null)
    setTranscription('')
    setError(null)
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Voice Input</h3>
          {audioBlob && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRecording}
              disabled={isTranscribing || isProcessing}
              aria-label="Clear recording"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        <div className="flex flex-col items-center gap-4">
          {!audioBlob ? (
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              className="rounded-full h-20 w-20"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-8 w-8" />
                  <span className="sr-only">Stop recording</span>
                </>
              ) : (
                <>
                  <Mic className="h-8 w-8" />
                  <span className="sr-only">Start recording</span>
                </>
              )}
            </Button>
          ) : (
            <div className="w-full space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 text-sm text-muted-foreground">
                  Recording complete
                </div>
                <audio
                  src={URL.createObjectURL(audioBlob)}
                  controls
                  className="h-8"
                />
              </div>

              {isTranscribing && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transcribing...
                </div>
              )}

              {transcription && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{transcription}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {isRecording && (
          <div className="text-center text-sm text-muted-foreground animate-pulse">
            Recording... Click to stop
          </div>
        )}
      </div>
    </Card>
  )
}