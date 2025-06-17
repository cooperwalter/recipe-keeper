'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mic, MicOff, Loader2, AlertCircle, ChevronRight, RotateCcw } from 'lucide-react'
import { VoiceWaveAnimation } from '@/components/ui/voice-wave-animation'
import { VoiceReviewForm } from './voice-review-form'

interface ExtractedRecipe {
  title: string
  description?: string
  ingredients: Array<{
    ingredient: string
    amount?: string
    unit?: string
  }>
  instructions: string[]
  prepTime?: number
  cookTime?: number
  servings?: number
  sourceName?: string
  sourceNotes?: string
}

export function VoiceRecipeFlow() {
  const router = useRouter()
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            }
          }
          
          setTranscript(prev => prev + finalTranscript)
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'no-speech') {
            setError('No speech detected. Please try again.')
          } else {
            setError('Speech recognition error. Please try again.')
          }
          stopRecording()
        }
        
        recognitionRef.current = recognition
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setError(null)
      setTranscript('')
      setRecordingTime(0)
      
      // Get microphone access for audio level monitoring
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // Set up audio level detection
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048 // Increased for better frequency resolution
      analyserRef.current.smoothingTimeConstant = 0.8 // Increased for less jumpy values
      analyserRef.current.minDecibels = -90 // More sensitive to quiet sounds
      analyserRef.current.maxDecibels = -10 // Adjust range for voice
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      // Monitor audio levels
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
        
        // Calculate RMS from time domain data for smoothness
        let rmsSum = 0
        for (let i = 0; i < bufferLength; i++) {
          // Convert to -1 to 1 range
          const normalized = (dataArray[i] - 128) / 128
          rmsSum += normalized * normalized
        }
        const rms = Math.sqrt(rmsSum / bufferLength)
        
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
        
        // Use multiple detection methods
        const amplitudeLevel = amplitude * 15
        const rmsLevel = rms * 25
        const freqLevel = Math.max(avgFreq * 15, freqPeak * 5)
        
        // Take the maximum of all methods
        const level = Math.max(amplitudeLevel, rmsLevel, freqLevel)
        const amplifiedLevel = Math.min(1, level)
        
        // Add some smoothing to prevent jitter
        setAudioLevel(prev => prev * 0.7 + amplifiedLevel * 0.3)
      }
      
      // Set recording state immediately to avoid cutting off initial words
      setIsRecording(true)
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
        
        // Start monitoring audio levels with setInterval for consistent updates
        // Run every 50ms (20 times per second) for smooth animation
        intervalRef.current = setInterval(() => {
          monitorAudioLevel()
        }, 50)
      } else {
        setError('Speech recognition not supported in your browser')
        setIsRecording(false)
        stream.getTracks().forEach(track => track.stop())
        return
      }
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to start recording')
    }
  }

  const stopRecording = () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsRecording(false)
    setAudioLevel(0)
  }

  const processVoiceInput = async () => {
    if (!transcript.trim()) {
      setError('No speech detected. Please record your recipe again.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/recipes/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process voice input')
      }

      const { recipe } = await response.json()
      setExtractedRecipe(recipe)
    } catch (err) {
      console.error('Error processing voice input:', err)
      setError(err instanceof Error ? err.message : 'Failed to process voice input')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRecipeCreated = (recipeId: string) => {
    router.push(`/protected/recipes/${recipeId}`)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // If we have extracted recipe data, show the review form
  if (extractedRecipe) {
    return (
      <VoiceReviewForm
        extractedData={extractedRecipe}
        transcript={transcript}
        onRecipeCreated={handleRecipeCreated}
        onBack={() => {
          setExtractedRecipe(null)
          setTranscript('')
          setRecordingTime(0)
        }}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Recording Card */}
      <Card>
        <CardHeader>
          <CardTitle>Speak Your Recipe</CardTitle>
          <CardDescription>
            Press the microphone button and describe your recipe. Include the name, ingredients with amounts, and step-by-step instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording Button */}
          <div className="flex flex-col items-center space-y-4">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className="w-32 h-32 rounded-full"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <MicOff className="h-12 w-12" />
              ) : (
                <Mic className="h-12 w-12" />
              )}
            </Button>
            
            {isRecording && (
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-destructive">Recording...</p>
                <p className="text-2xl font-mono">{formatTime(recordingTime)}</p>
                <VoiceWaveAnimation isActive={isRecording} audioLevel={audioLevel} className="text-destructive" />
              </div>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="space-y-2">
              <h3 className="font-medium">What we heard:</h3>
              <div className="p-4 bg-muted rounded-lg max-h-48 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{transcript}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {transcript && !isRecording && (
            <div className="flex gap-2">
              <Button
                onClick={processVoiceInput}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Recipe...
                  </>
                ) : (
                  <>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTranscript('')
                  setRecordingTime(0)
                  setError(null)
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips for Speaking Recipes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Start with the recipe name</li>
            <li>• Clearly state each ingredient with its amount</li>
            <li>• Pause between ingredients and instructions</li>
            <li>• Number your steps or say &quot;first&quot;, &quot;next&quot;, &quot;then&quot;</li>
            <li>• Mention cooking times and temperatures</li>
            <li>• Add any family notes or memories at the end</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}