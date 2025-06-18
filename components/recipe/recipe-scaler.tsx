'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'

interface RecipeScalerProps {
  originalServings: number
  onScaleChange: (scale: number) => void
}

export function RecipeScaler({ originalServings, onScaleChange }: RecipeScalerProps) {
  const [scale, setScale] = useState<string>('1')

  const handleScaleChange = (value: string) => {
    if (value) {
      setScale(value)
      onScaleChange(parseFloat(value))
    }
  }

  const scaledServings = Math.round(originalServings * parseFloat(scale))

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calculator className="h-4 w-4" />
        <span>Scale recipe:</span>
      </div>
      <ToggleGroup 
        type="single" 
        value={scale} 
        onValueChange={handleScaleChange}
        className="flex gap-1"
      >
        <ToggleGroupItem 
          value="1" 
          aria-label="Original size"
          className="px-3 py-1 text-sm"
        >
          1x
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="2" 
          aria-label="Double recipe"
          className="px-3 py-1 text-sm"
        >
          2x
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="3" 
          aria-label="Triple recipe"
          className="px-3 py-1 text-sm"
        >
          3x
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="text-sm text-muted-foreground">
        ({scaledServings} servings)
      </div>
    </div>
  )
}