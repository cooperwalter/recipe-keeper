'use client'

import { useState, useEffect } from 'react'
import { Minus, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react'
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
import { cn } from '@/lib/utils'

interface IngredientAdjusterProps {
  ingredientName: string
  originalAmount: number
  scaledAmount: number
  unit?: string
  scale?: number
  onAdjustment: (amount: number | undefined) => void
  adjustmentReason?: string
  hasCustomAdjustment: boolean
}

export function IngredientAdjuster({
  ingredientName,
  originalAmount,
  scaledAmount,
  unit,
  onAdjustment,
  adjustmentReason,
  hasCustomAdjustment
}: IngredientAdjusterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentValue, setCurrentValue] = useState<number>(scaledAmount)
  const [customAmount, setCustomAmount] = useState<string>(formatAmount(scaledAmount))
  
  useEffect(() => {
    setCurrentValue(scaledAmount)
    setCustomAmount(formatAmount(scaledAmount))
  }, [scaledAmount])

  const handleIncrement = () => {
    const increment = currentValue < 1 ? 0.125 : 0.25
    const newAmount = Math.round((currentValue + increment) * 8) / 8 // Round to nearest 1/8
    setCurrentValue(newAmount)
    setCustomAmount(formatAmount(newAmount))
    onAdjustment(newAmount)
  }

  const handleDecrement = () => {
    const decrement = currentValue <= 1 ? 0.125 : 0.25
    const newAmount = Math.max(0.125, Math.round((currentValue - decrement) * 8) / 8)
    setCurrentValue(newAmount)
    setCustomAmount(formatAmount(newAmount))
    onAdjustment(newAmount)
  }

  const handleReset = () => {
    setCurrentValue(scaledAmount)
    setCustomAmount(formatAmount(scaledAmount))
    onAdjustment(undefined)
    setIsOpen(false)
  }

  const handleInputChange = (value: string) => {
    setCustomAmount(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      setCurrentValue(numValue)
      onAdjustment(numValue)
    }
  }

  const isAdjusted = hasCustomAdjustment || Math.abs(scaledAmount - originalAmount) > 0.01

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-0.5 ml-1 hover:bg-muted/50",
            isAdjusted && "text-primary"
          )}
          aria-label={`Adjust amount for ${ingredientName}`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                {adjustmentReason || "Click to fine-tune this ingredient amount"}
              </p>
            </TooltipContent>
          </Tooltip>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Adjust {ingredientName}</h4>
            {adjustmentReason && (
              <p className="text-xs text-muted-foreground">{adjustmentReason}</p>
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
                value={customAmount}
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
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Base Amount: {formatAmount(originalAmount)} {unit}</span>
            {hasCustomAdjustment && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs"
                onClick={handleReset}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}