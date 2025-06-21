'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Check, X, Edit2, Plus, Minus, RefreshCw } from 'lucide-react'

interface RecipeChange {
  type: 'add' | 'remove' | 'modify'
  field: 'title' | 'description' | 'ingredients' | 'instructions' | 'prepTime' | 'cookTime' | 'servings' | 'sourceName' | 'sourceNotes' | 'categories' | 'isPublic' | 'badges'  // 'tags' temporarily removed
  oldValue?: unknown
  newValue?: unknown
  details?: string
}

interface VoiceChangeReviewProps {
  changes: RecipeChange[]
  onApprove: (changes: RecipeChange[]) => void
  onCancel: () => void
  isApplying?: boolean
}

export function VoiceChangeReview({ changes: initialChanges, onApprove, onCancel, isApplying = false }: VoiceChangeReviewProps) {
  const [changes, setChanges] = useState<RecipeChange[]>(initialChanges)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState<unknown>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRemoveChange = (index: number) => {
    setChanges(changes.filter((_, i) => i !== index))
  }

  const handleEditChange = (index: number) => {
    setEditingIndex(index)
    setEditValue(changes[index].newValue)
  }

  const handleSaveEdit = (index: number) => {
    const updatedChanges = [...changes]
    updatedChanges[index] = {
      ...updatedChanges[index],
      newValue: editValue
    }
    setChanges(updatedChanges)
    setEditingIndex(null)
    setEditValue(null)
  }

  const handleApprove = () => {
    if (changes.length === 0) {
      onCancel()
      return
    }
    setShowConfirm(true)
  }

  const confirmApprove = () => {
    onApprove(changes)
    setShowConfirm(false)
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <Plus className="h-4 w-4" />
      case 'remove':
        return <Minus className="h-4 w-4" />
      case 'modify':
        return <RefreshCw className="h-4 w-4" />
      default:
        return null
    }
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      title: 'Title',
      description: 'Description',
      ingredients: 'Ingredients',
      instructions: 'Instructions',
      prepTime: 'Prep Time',
      cookTime: 'Cook Time',
      servings: 'Servings',
      notes: 'Notes',
      // tags: 'Tags'  // Tags feature temporarily disabled
    }
    return labels[field] || field
  }

  const renderChangeValue = (change: RecipeChange, isEditing: boolean) => {
    if (isEditing) {
      if (change.field === 'ingredients' || change.field === 'instructions') {
        return (
          <Textarea
            value={typeof editValue === 'object' && editValue !== null && 'ingredient' in editValue 
              ? (editValue as {ingredient: string}).ingredient 
              : typeof editValue === 'object' && editValue !== null && 'instruction' in editValue
              ? (editValue as {instruction: string}).instruction
              : editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            className="mt-2"
            rows={3}
          />
        )
      } else if (change.field === 'prepTime' || change.field === 'cookTime' || change.field === 'servings') {
        return (
          <Input
            type="number"
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            className="mt-2 w-32"
          />
        )
      } else {
        return (
          <Input
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            className="mt-2"
          />
        )
      }
    }

    // Display format
    if (change.field === 'ingredients') {
      const ing = change.newValue
      if (typeof ing === 'object' && ing && 'ingredient' in ing) {
        const ingredient = ing as {ingredient: string; amount?: string; unit?: string}
        return `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.ingredient}`.trim()
      }
      return change.newValue == null ? 'Nothing' : String(change.newValue)
    } else if (change.field === 'instructions') {
      const inst = change.newValue
      if (typeof inst === 'object' && inst && 'instruction' in inst) {
        const instruction = inst as {instruction: string; stepNumber: number}
        return `Step ${instruction.stepNumber}: ${instruction.instruction}`
      }
      return change.newValue == null ? 'Nothing' : String(change.newValue)
    } else if (change.field === 'prepTime' || change.field === 'cookTime') {
      return `${change.newValue} minutes`
    } /* else if (change.field === 'tags' && Array.isArray(change.newValue)) {
      return change.newValue.join(', ')
    } */  // Tags feature temporarily disabled
    
    return change.newValue == null ? 'Nothing' : String(change.newValue)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Recipe Changes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {changes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No changes detected. Try speaking more clearly about what you&apos;d like to change.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Review the changes below. You can edit or remove any change before applying.
              </p>
              
              {changes.map((change, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={change.type === 'remove' ? 'destructive' : 'default'}>
                          {getChangeIcon(change.type)}
                          <span className="ml-1">{change.type}</span>
                        </Badge>
                        <span className="font-medium">{getFieldLabel(change.field)}</span>
                      </div>
                      <div className="flex gap-1">
                        {editingIndex !== index && change.type !== 'remove' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditChange(index)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {editingIndex === index && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSaveEdit(index)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveChange(index)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {change.type === 'modify' && !!change.oldValue && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">From: </span>
                        <span className="line-through">
                          {(() => {
                            const val = change.oldValue
                            if (change.field === 'ingredients' && typeof val === 'object' && val && 'ingredient' in val) {
                              const ingredient = val as {ingredient: string; amount?: string; unit?: string}
                              return `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.ingredient}`.trim()
                            } else if (change.field === 'instructions' && typeof val === 'object' && val && 'instruction' in val) {
                              const instruction = val as {instruction: string; stepNumber: number}
                              return `Step ${instruction.stepNumber}: ${instruction.instruction}`
                            } else if (change.field === 'prepTime' || change.field === 'cookTime') {
                              return `${val} minutes`
                            } else if (Array.isArray(val)) {
                              return val.join(', ')
                            }
                            return val == null ? 'Nothing' : String(val)
                          })()}
                        </span>
                      </div>
                    )}

                    {change.type === 'remove' && !!change.oldValue && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Remove: </span>
                        <span className="font-medium">
                          {(() => {
                            const val = change.oldValue
                            if (change.field === 'ingredients' && typeof val === 'object' && val && 'ingredient' in val) {
                              const ingredient = val as {ingredient: string; amount?: string; unit?: string}
                              return `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.ingredient}`.trim()
                            } else if (change.field === 'instructions' && typeof val === 'object' && val && 'instruction' in val) {
                              const instruction = val as {instruction: string; stepNumber: number}
                              return `Step ${instruction.stepNumber}: ${instruction.instruction}`
                            }
                            return val == null ? 'Nothing' : String(val)
                          })()}
                        </span>
                      </div>
                    )}

                    {change.type !== 'remove' && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {change.type === 'modify' ? 'To: ' : 'Add: '}
                        </span>
                        <span className="font-medium">
                          {renderChangeValue(change, editingIndex === index)}
                        </span>
                      </div>
                    )}

                    {change.details && (
                      <p className="text-sm text-muted-foreground italic">
                        {change.details}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApplying || changes.length === 0}
            >
              {isApplying ? 'Applying Changes...' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Recipe Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to apply {changes.length} change{changes.length !== 1 ? 's' : ''} to your recipe. This action can be undone by editing the recipe again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>
              Apply Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}