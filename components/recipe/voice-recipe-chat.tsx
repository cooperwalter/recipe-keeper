'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { VoiceWaveAnimation } from '@/components/ui/voice-wave-animation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Mic, MicOff, Loader2, Send, MessageCircle } from 'lucide-react'
import { RecipeWithRelations } from '@/lib/types/recipe'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
            setTranscript(prev => prev + finalTranscript)
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
    isRecordingRef.current = false
    setAudioLevel(0)
    
    // Combine live transcript with main transcript
    const finalTranscript = transcript + (liveTranscript ? ' ' + liveTranscript : '')
    const trimmedTranscript = finalTranscript.trim()
    
    setTranscript(trimmedTranscript)
    setLiveTranscript('')
  }, [transcript, liveTranscript])

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
    
    // Clear transcript for next question
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
  }, [recipe, messages])

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
            <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollAreaRef}>
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
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t pt-4 space-y-4">
              {/* Voice Recording Status */}
              {isRecording && (
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-destructive">Recording...</p>
                  <p className="text-sm font-mono">{formatTime(recordingTime)}</p>
                  <VoiceWaveAnimation isActive={isRecording} audioLevel={audioLevel} className="text-destructive" />
                </div>
              )}

              {/* Live Transcription */}
              {(transcript || liveTranscript) && (
                <Card className="p-3">
                  <p className="text-sm">
                    {transcript}
                    {liveTranscript && (
                      <span className="text-muted-foreground italic">{liveTranscript}</span>
                    )}
                  </p>
                </Card>
              )}

              {/* Input Controls */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your question or use voice..."
                    className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={2}
                    disabled={isRecording || isProcessing}
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
                    disabled={!transcript.trim() || isProcessing || isRecording}
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