'use client'

import { cn } from "@/lib/utils"
import { ProgressLoading, ContextualLoading } from "./loading-states"
import { Card } from "./card"
import { Upload, FileImage, CheckCircle, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface UploadLoadingProps {
  stage: "uploading" | "processing" | "extracting" | "complete" | "error"
  progress?: number
  fileName?: string
  error?: string
  className?: string
}

const stageMessages = {
  uploading: "Uploading your image",
  processing: "Processing image",
  extracting: "Extracting recipe details", 
  complete: "Upload complete",
  error: "Upload failed"
}

const stageIcons = {
  uploading: <Upload className="h-8 w-8 animate-pulse" />,
  processing: <FileImage className="h-8 w-8 animate-pulse" />,
  extracting: <FileImage className="h-8 w-8 animate-pulse" />,
  complete: <CheckCircle className="h-8 w-8 text-green-500" />,
  error: <AlertCircle className="h-8 w-8 text-destructive" />
}

export function UploadLoading({ 
  stage, 
  progress = 0, 
  fileName,
  error,
  className 
}: UploadLoadingProps) {
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>()
  
  useEffect(() => {
    // Estimate time based on stage
    const estimates = {
      uploading: 5,
      processing: 10,
      extracting: 8,
      complete: 0,
      error: 0
    }
    setEstimatedTime(estimates[stage])
  }, [stage])

  return (
    <Card className={cn("p-8", className)}>
      <div className="flex flex-col items-center space-y-6">
        {/* Icon */}
        <div className={cn(
          "text-primary transition-colors",
          stage === "error" && "text-destructive",
          stage === "complete" && "text-green-500"
        )}>
          {stageIcons[stage]}
        </div>

        {/* Message */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">
            {stageMessages[stage]}
          </h3>
          {fileName && stage !== "error" && (
            <p className="text-sm text-muted-foreground">{fileName}</p>
          )}
          {error && stage === "error" && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Progress */}
        {stage !== "complete" && stage !== "error" && (
          <div className="w-full max-w-xs">
            <ProgressLoading
              progress={progress}
              estimatedTime={estimatedTime}
              label=""
            />
          </div>
        )}

        {/* Contextual message for processing */}
        {stage === "extracting" && (
          <ContextualLoading context="upload" showIcon={false} />
        )}
      </div>
    </Card>
  )
}

// OCR specific loading component
export function OCRProcessingLoading({ className }: { className?: string }) {
  const [stage, setStage] = useState(0)
  const stages = [
    "Analyzing image quality",
    "Detecting text regions", 
    "Extracting recipe content",
    "Parsing ingredients and steps",
    "Organizing recipe structure"
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % stages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [stages.length])

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-center gap-3">
        <div className="relative">
          <FileImage className="h-12 w-12 text-primary" />
          <div className="absolute -inset-1 animate-ping rounded-full bg-primary/20" />
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">Processing your recipe image</p>
        <p className="text-sm text-muted-foreground animate-fade-in" key={stage}>
          {stages[stage]}...
        </p>
      </div>

      <div className="flex justify-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              i === stage 
                ? "bg-primary scale-125" 
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  )
}