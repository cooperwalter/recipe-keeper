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
      setAnimationFrame(prev => (prev + 1) % 360) // Prevent overflow
    }, 50)
    
    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div className={cn("flex flex-col items-center justify-center gap-1", className)}>
      <div className="flex items-center justify-center gap-1 h-12">
        {[...Array(5)].map((_, i) => {
        // Always show some animation when active, even without audio
        const baseAnimation = isActive ? 0.3 + Math.sin((animationFrame / 20) + (i * 0.8)) * 0.2 : 0.3
        
        // Add audio level on top of base animation with more amplification
        const audioBoost = audioLevel * 4 // Increased amplification
        
        // Different phase shift for each bar for more dynamic effect
        const phaseShift = i * 0.5
        const dynamicBoost = audioLevel * Math.sin((animationFrame / 10) + phaseShift) * 0.5
        
        // Combine base animation with audio level
        const waveHeight = isActive 
          ? Math.max(0.2, Math.min(5, baseAnimation + audioBoost + dynamicBoost))
          : 0.3
          
        return (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-all duration-100 ease-out origin-bottom",
              className?.includes('text-destructive') ? "bg-destructive" : "bg-primary"
            )}
            style={{
              height: `${8 + waveHeight * 8}px`, // Dynamic height instead of transform
              opacity: isActive ? 0.8 + (audioLevel * 0.2) : 0.3,
              transform: `translateY(${isActive ? Math.sin((animationFrame / 15) + (i * 0.6)) * 2 : 0}px)`
            }}
          />
        )
        })}
      </div>
    </div>
  )
}