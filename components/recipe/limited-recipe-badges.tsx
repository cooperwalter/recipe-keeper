'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { RecipeBadges } from './recipe-badges'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MoreHorizontal } from 'lucide-react'

interface LimitedRecipeBadgesProps {
  badges: string[]
  limit: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  inline?: boolean // Keep indicator inline for list view
}

export function LimitedRecipeBadges({ 
  badges, 
  limit, 
  size = 'sm', 
  className,
  inline = false 
}: LimitedRecipeBadgesProps) {
  const [showAll, setShowAll] = useState(false)
  
  if (!badges || badges.length === 0) return null
  
  const visibleBadges = badges.slice(0, limit)
  const hiddenBadges = badges.slice(limit)
  const hasMore = badges.length > limit

  if (inline) {
    // Inline layout for list view
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <RecipeBadges 
          badges={visibleBadges} 
          size={size}
          showTooltip={false}
        />
        
        {hasMore && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-current/20',
                  'bg-muted/50 text-muted-foreground hover:bg-muted hover:border-current/40',
                  'transition-colors cursor-pointer',
                  size === 'sm' && 'px-2 py-0.5 text-xs',
                  size === 'md' && 'px-2.5 py-1 text-sm',
                  size === 'lg' && 'px-3 py-1.5 text-base'
                )}
              >
                <span className="font-medium">
                  +{hiddenBadges.length} more
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">Additional badges:</p>
                <RecipeBadges 
                  badges={hiddenBadges} 
                  size="sm"
                  showTooltip={true}
                />
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    )
  }

  // Stacked layout for grid view
  return (
    <div className={className}>
      <RecipeBadges 
        badges={visibleBadges} 
        size={size}
        showTooltip={false}
      />
      
      {hasMore && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-current/20',
                'bg-muted/50 text-muted-foreground hover:bg-muted hover:border-current/40',
                'transition-colors cursor-pointer mt-2',
                size === 'sm' && 'px-2 py-0.5 text-xs',
                size === 'md' && 'px-2.5 py-1 text-sm',
                size === 'lg' && 'px-3 py-1.5 text-base'
              )}
            >
              <span className="font-medium">
                +{hiddenBadges.length} more
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="text-sm font-medium mb-2">Additional badges:</p>
              <RecipeBadges 
                badges={hiddenBadges} 
                size="sm"
                showTooltip={true}
              />
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}