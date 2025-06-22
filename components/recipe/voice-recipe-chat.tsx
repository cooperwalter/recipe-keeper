'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { VoiceWaveAnimation } from '@/components/ui/voice-wave-animation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Mic, MicOff, Loader2, Send, MessageCircle } from 'lucide-react'
import { RecipeWithRelations } from '@/lib/types/recipe'
import { cn } from '@/lib/utils'

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

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface VoiceRecipeChatProps {
  recipe: RecipeWithRelations
}

export function VoiceRecipeChat({ recipe }: VoiceRecipeChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [useMediaRecorder, setUseMediaRecorder] = useState(false)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

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
            setTranscript(prev => {
              const newTranscript = prev + finalTranscript
              // Auto-focus on the input when we get text
              setTimeout(() => {
                const textarea = document.querySelector('textarea[placeholder*="Type your question"]') as HTMLTextAreaElement
                if (textarea) {
                  textarea.focus()
                }
              }, 50)
              return newTranscript
            })
          }
          setLiveTranscript(interimTranscript)
        }
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'no-speech') {
            setError('No speech detected. Please try speaking again.')
          } else if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please allow microphone access.')
          } else if (event.error === 'network') {
            setError('Network error. Please check your internet connection.')
          } else {
            setError(`Speech recognition error: ${event.error}`)
          }
        }
        
        recognition.onend = () => {
          if (isRecordingRef.current && recognitionRef.current) {
            try {
              recognition.start()
            } catch (err) {
              console.error('Error restarting recognition:', err)
            }
          }
        }
        
        recognition.start()
        recognitionRef.current = recognition
      } else {
        console.warn('Speech recognition not supported, using MediaRecorder fallback')
        setUseMediaRecorder(true)
      }
      
      // Set up MediaRecorder as fallback
      if (!SpeechRecognition || useMediaRecorder) {
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
                // If we're still in recording mode (continuous), append to existing transcript
                if (isRecordingRef.current) {
                  setTranscript(prev => prev + (prev ? ' ' : '') + text)
                } else {
                  setTranscript(text)
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

  const stopRecording = useCallback(() => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    
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
      
      setTranscript(trimmedTranscript)
      setLiveTranscript('')
    }
    // For MediaRecorder, transcript will be set in the onstop handler
  }, [transcript, liveTranscript, useMediaRecorder])

  const submitQuestion = useCallback(async (questionText: string) => {
    if (!questionText.trim()) return
    
    setError(null)
    setIsProcessing(true)
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: questionText,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    
    // Stop recording when sending
    if (isRecording) {
      stopRecording()
    }
    
    // Clear transcript
    setTranscript('')

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    try {
      // Send to API to get chat response
      const response = await fetch(`/api/recipes/${recipe.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: questionText,
          recipe: recipe,
          conversationHistory: messages.slice(-4) // Include last 4 messages for context
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't show error
        return
      }
      console.error('Error getting chat response:', err)
      setError('Failed to get a response. Please try again.')
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }
  }, [recipe, messages, isRecording, stopRecording])

  const handleSendClick = () => {
    if (transcript.trim()) {
      submitQuestion(transcript)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (transcript.trim() && !isProcessing) {
        submitQuestion(transcript)
      }
    }
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
      
      // Reset state
      setTranscript('')
      setLiveTranscript('')
      setIsProcessing(false)
      setError(null)
      setRecordingTime(0)
      setUseMediaRecorder(false)
    }
    setIsOpen(open)
  }, [isRecording, stopRecording])

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

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="w-full sm:w-auto"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Ask Recipe
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask questions about this recipe - substitutions, techniques, or cooking tips</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ask About This Recipe</DialogTitle>
            <DialogDescription>
              Ask any questions about {recipe.title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto pr-4 mb-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="mb-4">Ask me anything about this recipe!</p>
                    <div className="text-sm space-y-2">
                      <p>• &quot;What can I substitute for the eggs?&quot;</p>
                      <p>• &quot;How do I know when it&apos;s done baking?&quot;</p>
                      <p>• &quot;Can I make this ahead of time?&quot;</p>
                      <p>• &quot;What does &apos;fold in&apos; mean?&quot;</p>
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t pt-4 space-y-4">
              {/* Voice Recording Status */}
              {isRecording && (
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-destructive">Recording...</p>
                  <p className="text-sm font-mono">{formatTime(recordingTime)}</p>
                  <VoiceWaveAnimation isActive={isRecording} audioLevel={audioLevel} className="text-destructive" />
                  {useMediaRecorder && (
                    <p className="text-xs text-muted-foreground">
                      Transcription will appear after you stop recording
                    </p>
                  )}
                  {!useMediaRecorder && transcript && (
                    <p className="text-xs text-muted-foreground animate-pulse">
                      Press Enter or Send to send message
                    </p>
                  )}
                </div>
              )}

              {/* Live Transcription indicator when recording */}
              {isRecording && liveTranscript && (
                <div className="text-xs text-muted-foreground italic px-3">
                  Hearing: {liveTranscript}
                </div>
              )}

              {/* Input Controls */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isRecording ? "Speaking... (press Enter to send)" : "Type your question or use voice..."}
                    className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={2}
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    aria-label={isRecording ? "Stop recording" : "Start recording"}
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="icon"
                    onClick={handleSendClick}
                    disabled={!transcript.trim() || isProcessing}
                    aria-label="Send message"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}