'use client'

import { useRecipeForm } from './RecipeFormContext'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, X, GripVertical } from 'lucide-react'
import { CreateInstructionInput } from '@/lib/types/recipe'

export function InstructionsStep() {
  const { formData, updateFormData } = useRecipeForm()

  const addInstruction = () => {
    const newInstruction: Omit<CreateInstructionInput, 'recipeId'> = {
      stepNumber: formData.instructions.length + 1,
      instruction: '',
    }
    updateFormData({ instructions: [...formData.instructions, newInstruction] })
  }

  const updateInstruction = (index: number, value: string) => {
    const updatedInstructions = [...formData.instructions]
    updatedInstructions[index] = {
      ...updatedInstructions[index],
      instruction: value,
    }
    updateFormData({ instructions: updatedInstructions })
  }

  const removeInstruction = (index: number) => {
    const updatedInstructions = formData.instructions.filter((_, i) => i !== index)
    // Update step numbers
    updatedInstructions.forEach((inst, i) => {
      inst.stepNumber = i + 1
    })
    updateFormData({ instructions: updatedInstructions })
  }

  const moveInstruction = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= formData.instructions.length) return

    const updatedInstructions = [...formData.instructions]
    const [removed] = updatedInstructions.splice(fromIndex, 1)
    updatedInstructions.splice(toIndex, 0, removed)
    
    // Update step numbers
    updatedInstructions.forEach((inst, i) => {
      inst.stepNumber = i + 1
    })
    
    updateFormData({ instructions: updatedInstructions })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Instructions (Optional)</Label>
        <Button
          type="button"
          onClick={addInstruction}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Step
        </Button>
      </div>

      {formData.instructions.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-2">No instructions added yet</p>
          <Button type="button" onClick={addInstruction} variant="outline">
            Add Your First Step
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {formData.instructions.map((instruction, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex flex-col gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => moveInstruction(index, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                {instruction.stepNumber}
              </div>

              <div className="flex-1">
                <Textarea
                  placeholder="Describe this step"
                  value={instruction.instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                type="button"
                onClick={() => removeInstruction(index)}
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                aria-label="Remove instruction"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Tip: Break down complex recipes into clear, manageable steps
      </p>
    </div>
  )
}