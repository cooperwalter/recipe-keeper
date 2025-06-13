'use client'

import { useRecipeForm } from './RecipeFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X, GripVertical } from 'lucide-react'
import { CreateIngredientInput } from '@/lib/types/recipe'

export function IngredientsStep() {
  const { formData, updateFormData } = useRecipeForm()

  const addIngredient = () => {
    const newIngredient: Omit<CreateIngredientInput, 'recipeId'> = {
      ingredient: '',
      amount: undefined,
      unit: '',
      orderIndex: formData.ingredients.length,
      notes: '',
    }
    updateFormData({ ingredients: [...formData.ingredients, newIngredient] })
  }

  const updateIngredient = (index: number, field: keyof Omit<CreateIngredientInput, 'recipeId'>, value: string | number | undefined) => {
    const updatedIngredients = [...formData.ingredients]
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value,
    }
    updateFormData({ ingredients: updatedIngredients })
  }

  const removeIngredient = (index: number) => {
    const updatedIngredients = formData.ingredients.filter((_, i) => i !== index)
    // Update order indices
    updatedIngredients.forEach((ing, i) => {
      ing.orderIndex = i
    })
    updateFormData({ ingredients: updatedIngredients })
  }

  const moveIngredient = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= formData.ingredients.length) return

    const updatedIngredients = [...formData.ingredients]
    const [removed] = updatedIngredients.splice(fromIndex, 1)
    updatedIngredients.splice(toIndex, 0, removed)
    
    // Update order indices
    updatedIngredients.forEach((ing, i) => {
      ing.orderIndex = i
    })
    
    updateFormData({ ingredients: updatedIngredients })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Ingredients *</Label>
        <Button
          type="button"
          onClick={addIngredient}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Ingredient
        </Button>
      </div>

      {formData.ingredients.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-2">No ingredients added yet</p>
          <Button type="button" onClick={addIngredient} variant="outline">
            Add Your First Ingredient
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {formData.ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex flex-col gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => moveIngredient(index, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={ingredient.amount || ''}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="0.25"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    placeholder="Unit"
                    value={ingredient.unit || ''}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Ingredient *"
                    value={ingredient.ingredient}
                    onChange={(e) => updateIngredient(index, 'ingredient', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    placeholder="Notes (optional)"
                    value={ingredient.notes || ''}
                    onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Tip: You can reorder ingredients by dragging them up or down
      </p>
    </div>
  )
}