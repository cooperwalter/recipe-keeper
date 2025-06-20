'use client'

import { useState, useEffect, useRef } from 'react'
import { Minus, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatAmount } from '@/lib/utils/recipe-scaling'

interface IngredientAdjusterProps {
  ingredientName: string
  ingredientId: string
  originalAmount: number
  unit?: string
  scale?: number
  currentAdjustedAmount?: number
  scalingRule?: { reason: string } | null
  onAdjustment: (amount: number | undefined) => void
}

export function IngredientAdjuster({
  ingredientName,
  originalAmount,
  unit,
  scale = 1,
  currentAdjustedAmount,
  scalingRule,
  onAdjustment
}: IngredientAdjusterProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Use adjusted amount if available, otherwise use scaled amount
  const defaultAmount = currentAdjustedAmount ?? (originalAmount * scale)
  
  // Local state for editing - only updates when popover opens or props change
  const [localValue, setLocalValue] = useState<number>(defaultAmount)
  const [localCustomAmount, setLocalCustomAmount] = useState<string>(formatAmount(defaultAmount))
  
  // Track if user has made changes during this session
  const hasLocalChanges = useRef(false)
  
  // Reset local state when popover opens
  useEffect(() => {
    if (isOpen) {
      const amount = currentAdjustedAmount ?? (originalAmount * scale)
      setLocalValue(amount)
      setLocalCustomAmount(formatAmount(amount))
      hasLocalChanges.current = false
    }
  }, [isOpen, originalAmount, scale, currentAdjustedAmount])

  const handleIncrement = () => {
    const increment = localValue < 1 ? 0.125 : 0.25
    const newAmount = Math.round((localValue + increment) * 8) / 8 // Round to nearest 1/8
    setLocalValue(newAmount)
    setLocalCustomAmount(formatAmount(newAmount))
    hasLocalChanges.current = true
  }

  const handleDecrement = () => {
    const decrement = localValue <= 1 ? 0.125 : 0.25
    const newAmount = Math.max(0.125, Math.round((localValue - decrement) * 8) / 8)
    setLocalValue(newAmount)
    setLocalCustomAmount(formatAmount(newAmount))
    hasLocalChanges.current = true
  }

  const handleInputChange = (value: string) => {
    setLocalCustomAmount(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      setLocalValue(numValue)
      hasLocalChanges.current = true
    }
  }

  const handleReset = () => {
    onAdjustment(undefined)
    setIsOpen(false)
  }
  
  const handleClose = (open: boolean) => {
    if (!open && hasLocalChanges.current) {
      // Only save if user made changes
      const currentDefault = currentAdjustedAmount ?? (originalAmount * scale)
      // Only trigger adjustment if the value actually changed
      if (Math.abs(localValue - currentDefault) > 0.001) {
        onAdjustment(localValue)
      }
    }
    setIsOpen(open)
  }

  return (
    <Popover open={isOpen} onOpenChange={handleClose}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0.5 ml-1 hover:bg-muted/50"
          aria-label={`Adjust amount for ${ingredientName}`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Adjust amount</p>
            </TooltipContent>
          </Tooltip>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm">Adjust {ingredientName}</h4>
            {scale === 1 ? null : scalingRule && (
              <p className="text-xs text-muted-foreground mt-1">
                {scalingRule.reason}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleDecrement}
              aria-label="Decrease amount"
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <div className="flex-1 flex items-center gap-1">
              <Input
                type="text"
                value={localCustomAmount}
                onChange={(e) => handleInputChange(e.target.value)}
                className="text-center h-8"
                aria-label="Custom amount"
              />
              {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleIncrement}
              aria-label="Increase amount"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Reset button for adjustments */}
          {currentAdjustedAmount !== undefined && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}