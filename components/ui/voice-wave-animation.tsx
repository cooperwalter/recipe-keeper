'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface VoiceWaveAnimationProps {
  isActive: boolean
  audioLevel?: number // 0-1 range
  className?: string
}

export function VoiceWaveAnimation({ isActive, audioLevel = 0, className }: VoiceWaveAnimationProps) {
  const [animationFrame, setAnimationFrame] = useState(0)
  
  useEffect(() => {
    if (!isActive) return
    
    const interval = setInterval(() => {
      setAnimationFrame(prev => prev + 1)
    }, 50)
    
    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div className={cn("flex items-center justify-center gap-1 h-8", className)}>
      {[...Array(5)].map((_, i) => {
        // Create a wave effect based on audio level
        const waveHeight = audioLevel > 0.01
          ? Math.max(0.3, Math.min(2.5, 0.3 + audioLevel * 3 * (1 + Math.sin(animationFrame / 10 + i * 0.5) * 0.5)))
          : 1
          
        return (
          <div
            key={i}
            className={cn(
              "w-1 h-4 rounded-full transition-transform duration-100 ease-out",
              className?.includes('text-destructive') ? "bg-destructive" : "bg-primary"
            )}
            style={{
              transform: `scaleY(${waveHeight})`,
              opacity: isActive ? (audioLevel > 0.01 ? 1 : 0.5) : 0.3
            }}
          />
        )
      })}
    </div>
  )
}