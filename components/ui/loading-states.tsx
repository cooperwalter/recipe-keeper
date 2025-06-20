import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"
import { Loader2 } from "lucide-react"

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