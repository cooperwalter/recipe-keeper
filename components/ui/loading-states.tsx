import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"
import { Loader2, Clock, ChefHat, BookOpen, Search, Upload } from "lucide-react"
import { useEffect, useState } from "react"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
  label?: string
}

export function LoadingSpinner({ 
  className, 
  size = "md",
  label 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {label && <span className="text-muted-foreground">{label}</span>}
    </div>
  )
}

interface LoadingDotsProps {
  className?: string
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
    </div>
  )
}

interface LoadingTextProps {
  text?: string
  className?: string
}

export function LoadingText({ text = "Loading", className }: LoadingTextProps) {
  return (
    <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
      <span>{text}</span>
      <LoadingDots className="h-4" />
    </div>
  )
}

interface ButtonLoadingProps {
  children: React.ReactNode
  isLoading?: boolean
  loadingText?: string
}

export function ButtonLoading({ 
  children, 
  isLoading, 
  loadingText 
}: ButtonLoadingProps) {
  if (!isLoading) return <>{children}</>
  
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {loadingText || children}
    </>
  )
}

// Skeleton components for specific content types
export function TextSkeleton({ 
  lines = 1, 
  className 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 && "w-3/4"
          )} 
        />
      ))}
    </div>
  )
}

export function HeadingSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return <Skeleton className={cn("h-8 w-48", className)} />
}

export function CardSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export function TableRowSkeleton({ 
  columns = 4,
  className 
}: { 
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn("flex items-center gap-4 p-4", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4 flex-1" 
        />
      ))}
    </div>
  )
}

// Enhanced shimmer effect skeleton
export function ShimmerSkeleton({ 
  className,
  children
}: { 
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Skeleton className="w-full h-full" />
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {children}
    </div>
  )
}

// Progress loading with estimated time
interface ProgressLoadingProps {
  progress: number
  estimatedTime?: number
  label?: string
  className?: string
}

export function ProgressLoading({ 
  progress, 
  estimatedTime,
  label = "Loading",
  className 
}: ProgressLoadingProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {estimatedTime && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {estimatedTime - elapsedTime > 0 
              ? `About ${estimatedTime - elapsedTime}s remaining`
              : "Almost done..."
            }
          </span>
        </div>
      )}
    </div>
  )
}

// Contextual loading messages
const loadingMessages = {
  recipes: [
    "Gathering your delicious recipes",
    "Loading your culinary collection",
    "Fetching your favorite dishes",
    "Preparing your recipe book"
  ],
  search: [
    "Searching through recipes",
    "Finding matching dishes",
    "Looking for culinary inspiration"
  ],
  save: [
    "Saving your recipe",
    "Preserving your culinary creation",
    "Adding to your collection"
  ],
  upload: [
    "Processing your image",
    "Analyzing recipe details",
    "Extracting ingredients"
  ]
}

interface ContextualLoadingProps {
  context: keyof typeof loadingMessages
  className?: string
  showIcon?: boolean
}

export function ContextualLoading({ 
  context, 
  className,
  showIcon = true
}: ContextualLoadingProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const messages = loadingMessages[context]

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [messages.length])

  const icons = {
    recipes: <ChefHat className="h-5 w-5" />,
    search: <Search className="h-5 w-5" />,
    save: <BookOpen className="h-5 w-5" />,
    upload: <Upload className="h-5 w-5" />
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showIcon && (
        <div className="text-primary animate-pulse">
          {icons[context]}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground animate-fade-in">
          {messages[messageIndex]}
        </span>
        <LoadingDots />
      </div>
    </div>
  )
}

// Loading state variations
interface LoadingStateProps {
  variant?: "initial" | "refresh" | "pagination" | "search"
  className?: string
}

export function LoadingState({ 
  variant = "initial", 
  className 
}: LoadingStateProps) {
  const variants = {
    initial: {
      icon: <Loader2 className="h-8 w-8 animate-spin" />,
      text: "Loading content",
      subtext: "This won't take long"
    },
    refresh: {
      icon: <Loader2 className="h-6 w-6 animate-spin" />,
      text: "Refreshing",
      subtext: null
    },
    pagination: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      text: "Loading more",
      subtext: null
    },
    search: {
      icon: <Search className="h-6 w-6 animate-pulse" />,
      text: "Searching",
      subtext: null
    }
  }

  const { icon, text, subtext } = variants[variant]

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <div className="text-muted-foreground mb-3">{icon}</div>
      <p className="text-sm font-medium">{text}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  )
}