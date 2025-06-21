'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mic, MicOff, Loader2, Volume2, X } from 'lucide-react'
import { VoiceWaveAnimation } from '@/components/ui/voice-wave-animation'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading-states'

interface VoiceRecorderProps {
  onTranscription: (text: string) => void
  isProcessing?: boolean
  className?: string
}

export interface VoiceRecorderRef {
  cleanup: () => void
}

export const VoiceRecorder = forwardRef<VoiceRecorderRef, VoiceRecorderProps>((
  { onTranscription, isProcessing = false, className },
  ref
) => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCleaningUpRef = useRef(false)
  const transcriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Set up audio level detection
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048 // Increased for better frequency resolution
      analyserRef.current.smoothingTimeConstant = 0.8 // Increased for less jumpy values
      analyserRef.current.minDecibels = -90 // More sensitive to quiet sounds
      analyserRef.current.maxDecibels = -10 // Adjust range for voice
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      console.log('Audio context setup:', {
        sampleRate: audioContextRef.current.sampleRate,
        analyserFFTSize: analyserRef.current.fftSize,
        frequencyBinCount: analyserRef.current.frequencyBinCount
      })
      
      // Start monitoring audio levels
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return
        
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        
        // Get time domain data first (more reliable)
        analyserRef.current.getByteTimeDomainData(dataArray)
        
        // Calculate peak-to-peak amplitude
        let max = 0
        let min = 255
        for (let i = 0; i < bufferLength; i++) {
          const sample = dataArray[i]
          if (sample > max) max = sample
          if (sample < min) min = sample
        }
        
        // Calculate the amplitude (0-1 range)
        const amplitude = (max - min) / 255
        
        // Get frequency data
        const freqDataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(freqDataArray)
        
        // Find the peak frequency magnitude
        let maxFreq = 0
        let avgFreq = 0
        for (let i = 0; i < bufferLength; i++) {
          avgFreq += freqDataArray[i]
          if (freqDataArray[i] > maxFreq) {
            maxFreq = freqDataArray[i]
          }
        }
        avgFreq = avgFreq / bufferLength / 255
        const freqPeak = maxFreq / 255
        
        // Calculate RMS from time domain data for smoothness
        let rmsSum = 0
        for (let i = 0; i < bufferLength; i++) {
          // Convert to -1 to 1 range
          const normalized = (dataArray[i] - 128) / 128
          rmsSum += normalized * normalized
        }
        const rms = Math.sqrt(rmsSum / bufferLength)
        
        // Use multiple detection methods
        // Amplitude gives good response to voice
        const amplitudeLevel = amplitude * 15
        // RMS provides smoother response
        const rmsLevel = rms * 25
        // Frequency peak for high frequency sounds
        const freqLevel = Math.max(avgFreq * 15, freqPeak * 5)
        
        // Take the maximum of all methods
        const level = Math.max(amplitudeLevel, rmsLevel, freqLevel)
        const clampedLevel = Math.min(1, level)
        
        // Debug logging - always log to see what's happening
        console.log('Audio analysis:', {
          amplitude: amplitude.toFixed(3),
          rms: rms.toFixed(3),
          avgFreq: avgFreq.toFixed(3),
          freqPeak: freqPeak.toFixed(3),
          amplitudeLevel: amplitudeLevel.toFixed(3),
          rmsLevel: rmsLevel.toFixed(3),
          freqLevel: freqLevel.toFixed(3),
          finalLevel: clampedLevel.toFixed(3),
          timeData: dataArray.slice(0, 10),
          freqData: freqDataArray.slice(0, 10),
          max,
          min,
          maxFreq
        })
        
        // Add some smoothing to prevent jitter
        setAudioLevel(prev => {
          const newLevel = prev * 0.7 + clampedLevel * 0.3
          return newLevel
        })
      }
      
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
        transcriptionTimeoutRef.current = setTimeout(() => {
          if (!isCleaningUpRef.current) {
            transcribeAudioInternal(blob)
          }
        }, 100)
      }
      
      // Start recording immediately to avoid cutting off initial words
      setIsRecording(true)
      mediaRecorder.start(100) // Collect data every 100ms for more responsive feedback
      
      // Start monitoring audio levels with setInterval for consistent updates
      // Run every 50ms (20 times per second) for smooth animation
      intervalRef.current = setInterval(() => {
        monitorAudioLevel()
      }, 50)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Unable to access microphone. Please check permissions.')
    }
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setAudioLevel(0)
      
      // Stop audio level monitoring
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [isRecording])

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


  const clearRecording = useCallback(() => {
    setAudioBlob(null)
    setTranscription('')
    setError(null)
  }, [])

  // Expose cleanup method via ref
  useImperativeHandle(ref, () => ({
    cleanup: () => {
      // Set cleanup flag to prevent auto-transcription
      isCleaningUpRef.current = true
      
      // Clear transcription timeout
      if (transcriptionTimeoutRef.current) {
        clearTimeout(transcriptionTimeoutRef.current)
        transcriptionTimeoutRef.current = null
      }
      
      // Stop recording if active
      if (isRecording) {
        stopRecording()
      }
      
      // Clear all state
      clearRecording()
      setIsTranscribing(false)
      
      // Clean up audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      // Reset cleanup flag after a delay
      setTimeout(() => {
        isCleaningUpRef.current = false
      }, 200)
    }
  }), [isRecording, stopRecording, clearRecording])

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
                <LoadingSpinner 
                  size="sm" 
                  label="Transcribing your voice"
                  className="justify-center"
                />
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
          <div className="flex flex-col items-center gap-2">
            <VoiceWaveAnimation isActive audioLevel={audioLevel} />
            <div className="text-center text-sm text-muted-foreground">
              Listening... Click to stop
            </div>
            {/* Debug: Show raw audio level with visual indicator */}
            <div className="w-full space-y-1">
              <div className="text-xs text-muted-foreground text-center">
                Debug - Audio Level: {(audioLevel * 100).toFixed(1)}%
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
})

VoiceRecorder.displayName = 'VoiceRecorder'