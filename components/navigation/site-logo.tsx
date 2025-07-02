'use client'

import { ChefHat } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useCallback, useState, useEffect } from 'react'

interface SiteLogoProps {
  className?: string
  iconClassName?: string
}

export function SiteLogo({ className = "font-bold text-xl", iconClassName = "h-6 w-6 text-primary" }: SiteLogoProps) {
  const router = useRouter()
  const clickCountRef = useRef(0)
  const lastClickTimeRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [clickFeedback, setClickFeedback] = useState(0)

  // Reset click count after 2 seconds of inactivity
  const resetClickCount = useCallback(() => {
    clickCountRef.current = 0
    setClickFeedback(0)
  }, [])

  const handleIconClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current
    
    // Reset if more than 2 seconds since last click
    if (timeSinceLastClick > 2000) {
      clickCountRef.current = 0
    }
    
    clickCountRef.current++
    lastClickTimeRef.current = now
    setClickFeedback(clickCountRef.current)
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Set new timeout to reset
    timeoutRef.current = setTimeout(resetClickCount, 2000)
    
    // Check if we've reached 10 clicks
    if (clickCountRef.current === 10) {
      // Navigate to secret page
      router.push('/system-info')
      resetClickCount()
    }
  }, [router, resetClickCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={handleIconClick}
        className="relative group"
        aria-label="Site logo"
      >
        <ChefHat 
          className={`${iconClassName} transition-transform duration-150 ${
            clickFeedback > 0 ? 'scale-90' : ''
          }`} 
        />
        {/* Visual feedback for clicks */}
        {clickFeedback > 0 && clickFeedback < 10 && (
          <span className="absolute -top-2 -right-2 text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center animate-in fade-in zoom-in duration-200">
            {clickFeedback}
          </span>
        )}
      </button>
      <Link href="/" className={className}>
        Recipe and Me
      </Link>
    </div>
  )
}