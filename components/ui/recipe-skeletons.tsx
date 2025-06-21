'use client'

import { cn } from "@/lib/utils"
import { ShimmerSkeleton } from "./loading-states"
import { Skeleton } from "./skeleton"
import { Clock, Users, ChefHat, Heart } from "lucide-react"

// Enhanced Recipe Card Skeleton with shimmer effect
export function RecipeCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      {/* Image skeleton with shimmer */}
      <ShimmerSkeleton className="h-48 w-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <ChefHat className="h-8 w-8 text-muted-foreground/20" />
        </div>
      </ShimmerSkeleton>
      
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-6 w-3/4" />
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        
        {/* Meta info */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground/40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground/40" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        
        {/* Favorite button skeleton */}
        <div className="absolute top-2 right-2">
          <div className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Heart className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Recipe List Item Skeleton
export function RecipeListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 overflow-hidden", className)}>
      <div className="flex gap-4">
        {/* Thumbnail with shimmer */}
        <ShimmerSkeleton className="h-24 w-24 rounded-lg flex-shrink-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-muted-foreground/20" />
          </div>
        </ShimmerSkeleton>
        
        <div className="flex-1 space-y-2">
          {/* Title */}
          <Skeleton className="h-5 w-1/3" />
          
          {/* Description */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          
          {/* Meta info */}
          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground/40" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground/40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Enhanced Recipe Detail Skeleton
export function RecipeDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("container mx-auto pt-0 pb-8 px-4", className)}>
      {/* Back button */}
      <Skeleton className="h-10 w-32 mb-6" />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ShimmerSkeleton className="h-10 w-64" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        
        {/* Description */}
        <ShimmerSkeleton className="h-6 w-full max-w-2xl mb-4" />
        
        {/* Meta info */}
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
      
      {/* Photo gallery skeleton */}
      <div className="mb-8">
        <ShimmerSkeleton className="h-96 w-full rounded-lg">
          <div className="absolute inset-0 flex items-center justify-center">
            <ChefHat className="h-16 w-16 text-muted-foreground/20" />
          </div>
        </ShimmerSkeleton>
      </div>
      
      {/* Recipe scaler */}
      <div className="mb-6">
        <Skeleton className="h-12 w-full max-w-md" />
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Ingredients */}
        <div className="md:col-span-1">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/40">•</span>
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="md:col-span-2">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-muted-foreground">{i + 1}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Version Comparison Skeleton
export function VersionComparisonSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("container mx-auto py-8 px-4", className)}>
      {/* Back button */}
      <Skeleton className="h-10 w-32 mb-8" />
      
      {/* Title */}
      <ShimmerSkeleton className="h-8 w-64 mb-6" />
      
      {/* Version cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Diff viewer skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <div className="flex-1 flex gap-4">
                <Skeleton className="h-4 flex-1" />
                <span className="text-muted-foreground">→</span>
                <Skeleton className="h-4 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Recipe Form Skeleton
export function RecipeFormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            {i < 3 && <Skeleton className="h-0.5 w-full mx-2" />}
          </div>
        ))}
      </div>
      
      {/* Form content */}
      <div className="space-y-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-24 w-full" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
      
      {/* Form actions */}
      <div className="flex justify-between pt-6">
        <Skeleton className="h-10 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  )
}

// Recipe Edit Form Skeleton
export function RecipeEditSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("container mx-auto px-4 py-8 animate-fade-in", className)}>
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-32 mb-4" />
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Form cards */}
      <div className="space-y-6 max-w-4xl">
        {/* Basic info card */}
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <Skeleton className="h-6 w-32 mb-6" />
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients card */}
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-10" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions card */}
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-28" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex items-center justify-center w-8 h-10">
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}