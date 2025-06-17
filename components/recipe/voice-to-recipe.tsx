'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { VoiceChangeReview } from './voice-change-review'
import { VoiceWaveAnimation } from '@/components/ui/voice-wave-animation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mic, MicOff, Loader2, ChevronRight } from 'lucide-react'
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
  field: 'title' | 'description' | 'ingredients' | 'instructions' | 'prepTime' | 'cookTime' | 'servings' | 'notes' | 'tags'
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
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
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
          
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript)
          }
          setLiveTranscript(interimTranscript)
        }
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'no-speech') {
            setError('No speech detected. Please try speaking again.')
          }
        }
        
        recognition.start()
        recognitionRef.current = recognition
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
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to access microphone')
    }
  }, [])

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
    setAudioLevel(0)
    setLiveTranscript('')
  }, [])

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
          transcript: text,
          currentRecipe: recipe 
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Failed to process voice command')
      }

      const data = await response.json()
      setChanges(data.changes || [])
      setShowReview(true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't show error
        return
      }
      console.error('Error processing voice command:', err)
      setError('Failed to understand the command. Please try again.')
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }
  }, [recipe])

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
        ingredients: [...recipe.ingredients],
        instructions: [...recipe.instructions],
        tags: [...recipe.tags]
      }

      // Apply each change
      for (const change of approvedChanges) {
        switch (change.field) {
          case 'title':
          case 'description':
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

          case 'tags':
            if (change.type === 'modify') {
              updatedData.tags = Array.isArray(change.newValue) ? change.newValue as string[] : [change.newValue as string]
            } else if (change.type === 'add') {
              const newTag = Array.isArray(change.newValue) ? (change.newValue as string[])[0] : change.newValue as string
              if (!updatedData.tags.includes(newTag)) {
                updatedData.tags.push(newTag)
              }
            }
            break

          case 'notes':
            if (change.type === 'modify') {
              updatedData.sourceNotes = change.newValue as string
            }
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
    }
    setIsOpen(open)
  }, [isRecording, stopRecording])

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Mic className="h-4 w-4" />
        Talk to Recipe
      </Button>

      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Talk to Your Recipe</DialogTitle>
            <DialogDescription>
              Use voice commands to modify your recipe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

                {/* Process Button */}
                {transcript && !isRecording && !isProcessing && (
                  <Button
                    onClick={() => processTranscript(transcript)}
                    className="w-full"
                  >
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Process Changes
                  </Button>
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