'use client'

import { useState, useEffect } from 'react'
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
  onAdjustment: (amount: number | undefined) => void
}

export function IngredientAdjuster({
  ingredientName,
  originalAmount,
  unit,
  onAdjustment
}: IngredientAdjusterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentValue, setCurrentValue] = useState<number>(originalAmount)
  const [customAmount, setCustomAmount] = useState<string>(formatAmount(originalAmount))
  
  useEffect(() => {
    setCurrentValue(originalAmount)
    setCustomAmount(formatAmount(originalAmount))
  }, [originalAmount])

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

  const handleInputChange = (value: string) => {
    setCustomAmount(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      setCurrentValue(numValue)
      onAdjustment(numValue)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
        </div>
      </PopoverContent>
    </Popover>
  )
}