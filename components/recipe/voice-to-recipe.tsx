'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { VoiceChangeReview } from './voice-change-review'
import { VoiceWaveAnimation } from '@/components/ui/voice-wave-animation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { RecipeWithRelations, Ingredient, Instruction } from '@/lib/types/recipe'

// Type for Web Speech API's SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onaudiostart: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onaudioend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null
  onnomatch: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null
  onsoundstart: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onsoundend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null
}

interface VoiceToRecipeProps {
  recipe: RecipeWithRelations
  onUpdate: (updatedData: RecipeWithRelations) => Promise<void>
}

interface RecipeChange {
  type: 'add' | 'remove' | 'modify'
  field: 'title' | 'description' | 'ingredients' | 'instructions' | 'prepTime' | 'cookTime' | 'servings' | 'sourceName' | 'sourceNotes' | 'categories' | 'isPublic' | 'badges'
  oldValue?: unknown
  newValue?: unknown
  details?: string
}

export function VoiceToRecipe({ recipe, onUpdate }: VoiceToRecipeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [changes, setChanges] = useState<RecipeChange[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [useMediaRecorder, setUseMediaRecorder] = useState(false)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const processTranscriptRef = useRef<((text: string) => void) | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const retryCountRef = useRef<number>(0)
  const maxRetriesRef = useRef<number>(3)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setLiveTranscript('')
      setTranscript('')
      setRecordingTime(0)
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // Set up audio level detection
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.8
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      // Set up speech recognition for real-time transcription
      const SpeechRecognition = ((window as Window & typeof globalThis & { SpeechRecognition?: new() => SpeechRecognition }).SpeechRecognition || 
                                  (window as Window & typeof globalThis & { webkitSpeechRecognition?: new() => SpeechRecognition }).webkitSpeechRecognition)
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = 'en-US'
          recognition.maxAlternatives = 1
          
          // Add additional event handlers for debugging
          recognition.onaudiostart = () => {
            console.log('Audio capture started')
          }
          
          recognition.onsoundstart = () => {
            console.log('Sound detected')
          }
          
          recognition.onspeechstart = () => {
            console.log('Speech detected')
          }
          
          recognition.onstart = () => {
            console.log('Speech recognition started successfully')
            // Reset retry count on successful start
            retryCountRef.current = 0
          }
          
          recognition.onresult = (event: SpeechRecognitionEvent) => {
            console.log('Speech recognition result:', event)
            let finalTranscript = ''
            let interimTranscript = ''
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' '
              } else {
                interimTranscript += transcript
              }
            }
            
            console.log('Final transcript:', finalTranscript, 'Interim:', interimTranscript)
            
            if (finalTranscript) {
              setTranscript(prev => prev + finalTranscript)
            }
            setLiveTranscript(interimTranscript)
          }
          
          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error)
            if (event.error === 'no-speech') {
              // Don't show error for no-speech, it's common
              console.log('No speech detected yet, continuing...')
            } else if (event.error === 'not-allowed') {
              setError('Microphone access denied. Please allow microphone access and try again.')
              // Stop recording on permission errors
              if (isRecordingRef.current) {
                isRecordingRef.current = false
                setIsRecording(false)
              }
            } else if (event.error === 'network') {
              // Network errors are common, especially in production
              // Don't show error immediately, try to handle gracefully
              console.log('Network error occurred, will retry if needed')
              // The onend handler will take care of restarting if still recording
            } else if (event.error === 'audio-capture') {
              setError('Failed to capture audio. Please check your microphone.')
              if (isRecordingRef.current) {
                isRecordingRef.current = false
                setIsRecording(false)
              }
            } else if (event.error === 'aborted') {
              // Recognition was aborted, likely intentionally
              console.log('Speech recognition aborted')
            } else {
              setError(`Speech recognition error: ${event.error}`)
            }
          }
          
          recognition.onend = () => {
            console.log('Speech recognition ended')
            // If recognition ends unexpectedly while recording, restart it
            if (isRecordingRef.current && recognitionRef.current) {
              // Clear any existing retry timeout
              if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
              }
              
              // Implement exponential backoff for retries
              if (retryCountRef.current < maxRetriesRef.current) {
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 8000)
                console.log(`Restarting speech recognition in ${backoffDelay}ms (retry ${retryCountRef.current + 1}/${maxRetriesRef.current})`)
                
                retryTimeoutRef.current = setTimeout(() => {
                  try {
                    if (isRecordingRef.current && recognitionRef.current) {
                      recognition.start()
                      retryCountRef.current++
                    }
                  } catch (err) {
                    console.error('Error restarting recognition:', err)
                    // If we can't restart, fall back to MediaRecorder
                    if (err instanceof Error && err.message.includes('already started')) {
                      // Recognition is already running, reset retry count
                      retryCountRef.current = 0
                    } else {
                      console.log('Falling back to MediaRecorder due to repeated failures')
                      setUseMediaRecorder(true)
                    }
                  }
                }, backoffDelay)
              } else {
                console.log('Max retries reached, falling back to MediaRecorder')
                setError('Speech recognition is having issues. Recording audio for transcription instead.')
                setUseMediaRecorder(true)
              }
            } else {
              // Recording stopped normally, reset retry count
              retryCountRef.current = 0
            }
          }
          
          recognition.start()
          recognitionRef.current = recognition
        } catch (err) {
          console.error('Failed to initialize speech recognition:', err)
          console.log('Falling back to MediaRecorder API')
          setUseMediaRecorder(true)
        }
      } else {
        console.warn('Speech recognition not supported, using MediaRecorder fallback')
        setUseMediaRecorder(true)
      }
      
      // Set up MediaRecorder as fallback
      if (useMediaRecorder || !SpeechRecognition) {
        try {
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
            
            // Send to transcription API
            try {
              const formData = new FormData()
              formData.append('audio', blob, 'recording.webm')
              
              const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
              })
              
              if (response.ok) {
                const { text } = await response.json()
                setTranscript(text)
                // Auto-process after transcription
                if (text) {
                  setTimeout(() => {
                    processTranscriptRef.current?.(text)
                  }, 500)
                }
              } else {
                const error = await response.json()
                setError(error.error || 'Failed to transcribe audio')
              }
            } catch (err) {
              console.error('Transcription error:', err)
              setError('Failed to transcribe audio. Please try again.')
            }
          }
          
          mediaRecorder.start(100) // Collect data every 100ms
          console.log('MediaRecorder started as fallback')
        } catch (err) {
          console.error('Failed to set up MediaRecorder:', err)
          setError('Failed to initialize audio recording')
        }
      }
      
      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return
        
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteTimeDomainData(dataArray)
        
        let max = 0
        let min = 255
        for (let i = 0; i < bufferLength; i++) {
          const sample = dataArray[i]
          if (sample > max) max = sample
          if (sample < min) min = sample
        }
        
        const amplitude = (max - min) / 255
        setAudioLevel(amplitude * 10)
      }
      
      intervalRef.current = setInterval(monitorAudioLevel, 50)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      setIsRecording(true)
      isRecordingRef.current = true
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to access microphone')
    }
  }, [useMediaRecorder])

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    // Reset retry count
    retryCountRef.current = 0
    
    // Stop MediaRecorder if using fallback
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      // Don't null it here, let onstop handle cleanup
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
    
    // Clean up audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsRecording(false)
    isRecordingRef.current = false
    setAudioLevel(0)
    
    // Only process transcript for Web Speech API
    if (!useMediaRecorder) {
      // Combine live transcript with main transcript
      const finalTranscript = transcript + (liveTranscript ? ' ' + liveTranscript : '')
      const trimmedTranscript = finalTranscript.trim()
      
      console.log('Final transcript:', trimmedTranscript)
      setTranscript(trimmedTranscript)
      setLiveTranscript('')
      
      // Automatically process the transcript if we have one
      if (trimmedTranscript) {
        console.log('Processing transcript:', trimmedTranscript)
        setTimeout(() => {
          processTranscriptRef.current?.(trimmedTranscript)
        }, 500)
      } else if (recordingTime > 0) {
        // If we recorded something but got no transcript
        console.log('No transcript detected after recording for', recordingTime, 'seconds')
        setError('No speech was detected. Please try speaking more clearly.')
      }
    }
    // For MediaRecorder, processing happens in the onstop handler
  }, [transcript, liveTranscript, recordingTime, useMediaRecorder])

  const processTranscript = useCallback(async (text: string) => {
    setError(null)
    setIsProcessing(true)

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    try {
      // Send to API to interpret changes
      const response = await fetch(`/api/recipes/${recipe.id}/voice-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: text
        }),
        signal: abortControllerRef.current.signal
      })

      let data
      const contentType = response.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON. Content-Type:', contentType)
        console.error('Response status:', response.status, response.statusText)
        throw new Error('Server returned an invalid response format')
      }
      
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError)
        console.error('Response headers:', response.headers)
        throw new Error('Server returned an invalid response')
      }
      
      if (!response.ok) {
        console.error('API error:', data)
        throw new Error(data?.error || 'Failed to process voice command')
      }

      console.log('Voice update response:', data)
      
      if (!data.changes || data.changes.length === 0) {
        setError("I couldn't understand what changes you want to make. Please try speaking more clearly.")
        return
      }
      
      setChanges(data.changes)
      setShowReview(true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't show error
        return
      }
      console.error('Error processing voice command:', err)
      
      // Provide more specific error messages
      if (err instanceof Error) {
        if (err.message.includes('Server returned an invalid response')) {
          setError('The server encountered an error. Please check your internet connection and try again.')
        } else if (err.message.includes('ANTHROPIC_API_KEY')) {
          setError('Voice processing is not properly configured. Please contact support.')
        } else {
          setError(err.message || 'Failed to understand the command. Please try again.')
        }
      } else {
        setError('Failed to understand the command. Please try again.')
      }
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }
  }, [recipe])

  // Update the ref whenever processTranscript changes
  useEffect(() => {
    processTranscriptRef.current = processTranscript
  }, [processTranscript])

  const applyChanges = async (approvedChanges: RecipeChange[]) => {
    setIsApplying(true)
    setError(null)

    try {
      // Build the updated recipe data
      const updatedData: RecipeWithRelations = {
        ...recipe,
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        sourceName: recipe.sourceName,
        sourceNotes: recipe.sourceNotes,
        isPublic: recipe.isPublic || false,
        badges: recipe.badges ? [...recipe.badges] : [],
        ingredients: [...recipe.ingredients],
        instructions: [...recipe.instructions],
        categories: recipe.categories ? [...recipe.categories] : []
      }

      // Apply each change
      for (const change of approvedChanges) {
        switch (change.field) {
          case 'title':
          case 'description':
          case 'sourceName':
            if (change.type === 'modify') {
              updatedData[change.field] = change.newValue as string
            }
            break

          case 'prepTime':
          case 'cookTime':
          case 'servings':
            if (change.type === 'modify') {
              updatedData[change.field] = parseInt(change.newValue as string) || 0
            }
            break
            
          case 'isPublic':
            if (change.type === 'modify') {
              updatedData.isPublic = change.newValue as boolean
            }
            break

          case 'ingredients':
            if (change.type === 'add') {
              updatedData.ingredients.push(change.newValue as Ingredient)
            } else if (change.type === 'remove') {
              const index = updatedData.ingredients.findIndex((ing) => 
                ing.ingredient === (change.oldValue as Ingredient).ingredient
              )
              if (index !== -1) {
                updatedData.ingredients.splice(index, 1)
              }
            } else if (change.type === 'modify') {
              const index = updatedData.ingredients.findIndex((ing) => 
                ing.ingredient === (change.oldValue as Ingredient).ingredient
              )
              if (index !== -1) {
                updatedData.ingredients[index] = change.newValue as Ingredient
              }
            }
            break

          case 'instructions':
            if (change.type === 'add') {
              updatedData.instructions.push(change.newValue as Instruction)
              // Renumber steps
              updatedData.instructions = updatedData.instructions.map((inst, i) => ({
                ...inst,
                stepNumber: i + 1
              }))
            } else if (change.type === 'remove') {
              const index = updatedData.instructions.findIndex((inst) => 
                inst.stepNumber === (change.oldValue as Instruction).stepNumber
              )
              if (index !== -1) {
                updatedData.instructions.splice(index, 1)
                // Renumber remaining steps
                updatedData.instructions = updatedData.instructions.map((inst, i) => ({
                  ...inst,
                  stepNumber: i + 1
                }))
              }
            } else if (change.type === 'modify') {
              const index = updatedData.instructions.findIndex((inst) => 
                inst.stepNumber === (change.oldValue as Instruction).stepNumber
              )
              if (index !== -1) {
                updatedData.instructions[index] = {
                  ...updatedData.instructions[index],
                  instruction: (change.newValue as Instruction).instruction || (change.newValue as string)
                }
              }
            }
            break

          case 'sourceNotes':
            if (change.type === 'modify') {
              updatedData.sourceNotes = change.newValue as string
            }
            break
            
          case 'badges':
            if (change.type === 'modify') {
              updatedData.badges = Array.isArray(change.newValue) ? change.newValue as string[] : [change.newValue as string]
            } else if (change.type === 'add') {
              const newBadge = Array.isArray(change.newValue) ? (change.newValue as string[])[0] : change.newValue as string
              if (!updatedData.badges) {
                updatedData.badges = []
              }
              if (!updatedData.badges.includes(newBadge)) {
                updatedData.badges.push(newBadge)
              }
            } else if (change.type === 'remove') {
              if (updatedData.badges) {
                const badgeToRemove = change.oldValue as string
                updatedData.badges = updatedData.badges.filter(badge => badge !== badgeToRemove)
              }
            }
            break
            
          case 'categories':
            // Categories are more complex as they're objects with id, name, etc.
            // For now, we'll just log a message as categories need special handling
            console.log('Category changes need to be implemented with proper category lookup')
            break
        }
      }

      // Call the update function
      await onUpdate(updatedData)
      
      // Reset state
      setChanges([])
      setTranscript('')
      setShowReview(false)
      setIsOpen(false)
    } catch (err) {
      console.error('Error applying changes:', err)
      setError('Failed to apply changes. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleCancel = () => {
    setShowReview(false)
    setChanges([])
    setTranscript('')
    setLiveTranscript('')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      // Stop recording if in progress
      if (isRecording) {
        stopRecording()
      }
      
      // Cancel any pending API requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      // Reset all state when dialog is closed
      setTranscript('')
      setLiveTranscript('')
      setChanges([])
      setIsProcessing(false)
      setIsApplying(false)
      setError(null)
      setShowReview(false)
      setRecordingTime(0)
      setUseMediaRecorder(false)
    }
    setIsOpen(open)
  }, [isRecording, stopRecording])

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            onClick={() => setIsOpen(true)}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Speak to Edit
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Use voice commands to quickly modify any part of your recipe</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Talk to Your Recipe</DialogTitle>
            <DialogDescription>
              Use voice commands to modify your recipe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {!showReview ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Speak naturally about what you&apos;d like to change. For example:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>&quot;Add more flour, about half a cup&quot;</li>
                  <li>&quot;Change the baking time to 25 minutes&quot;</li>
                  <li>&quot;Remove the vanilla extract&quot;</li>
                  <li>&quot;Add a note about room temperature eggs&quot;</li>
                  <li>&quot;This recipe is from Grandma&quot;</li>
                  <li>&quot;Change the recipe source to Grandma Mary&quot;</li>
                  <li>&quot;Make this recipe public&quot;</li>
                  <li>&quot;Add vegan and gluten-free badges&quot;</li>
                </ul>

                {/* Recording Controls */}
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
                      {useMediaRecorder && (
                        <p className="text-xs text-muted-foreground">
                          Using audio recording (transcription after stop)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Transcription */}
                {(transcript || liveTranscript) && !isProcessing && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">What we&apos;re hearing:</h4>
                      <p className="text-sm">
                        {transcript}
                        {liveTranscript && (
                          <span className="text-muted-foreground italic">{liveTranscript}</span>
                        )}
                      </p>
                    </div>
                  </Card>
                )}

                {/* Auto-processing message */}
                {transcript && !isRecording && !isProcessing && !showReview && (
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Processing will start automatically...
                    </p>
                  </Card>
                )}

                {isProcessing && (
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Understanding your request...</span>
                    </div>
                  </Card>
                )}

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
              </>
            ) : (
              <>
                <VoiceChangeReview
                  changes={changes}
                  onApprove={applyChanges}
                  onCancel={handleCancel}
                  isApplying={isApplying}
                />
                {error && (
                  <div className="text-sm text-destructive mt-4">{error}</div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}