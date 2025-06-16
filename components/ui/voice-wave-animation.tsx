'use client'

import { cn } from '@/lib/utils'

interface VoiceWaveAnimationProps {
  isActive: boolean
  className?: string
}

export function VoiceWaveAnimation({ isActive, className }: VoiceWaveAnimationProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-300",
            isActive ? "animate-voice-wave" : "h-4",
            className?.includes('text-destructive') ? "bg-destructive" : "bg-primary"
          )}
          style={{
            animationDelay: isActive ? `${i * 0.1}s` : '0s',
            height: isActive ? undefined : '16px'
          }}
        />
      ))}
    </div>
  )
}