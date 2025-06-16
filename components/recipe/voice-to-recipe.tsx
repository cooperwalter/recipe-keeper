'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { VoiceRecorder } from './voice-recorder'
import { VoiceChangeReview } from './voice-change-review'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mic, Loader2 } from 'lucide-react'
import { RecipeWithRelations } from '@/lib/types/recipe'

interface VoiceToRecipeProps {
  recipe: RecipeWithRelations
  onUpdate: (updatedData: any) => Promise<void>
}

interface RecipeChange {
  type: 'add' | 'remove' | 'modify'
  field: 'title' | 'description' | 'ingredients' | 'instructions' | 'prepTime' | 'cookTime' | 'servings' | 'notes' | 'tags'
  oldValue?: any
  newValue?: any
  details?: string
}

export function VoiceToRecipe({ recipe, onUpdate }: VoiceToRecipeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [changes, setChanges] = useState<RecipeChange[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)

  const handleTranscription = async (text: string) => {
    setTranscript(text)
    setError(null)
    setIsProcessing(true)

    try {
      // Send to API to interpret changes
      const response = await fetch(`/api/recipes/${recipe.id}/voice-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: text,
          currentRecipe: recipe 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process voice command')
      }

      const data = await response.json()
      setChanges(data.changes || [])
      setShowReview(true)
    } catch (err) {
      console.error('Error processing voice command:', err)
      setError('Failed to understand the command. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const applyChanges = async (approvedChanges: RecipeChange[]) => {
    setIsApplying(true)
    setError(null)

    try {
      // Build the updated recipe data
      const updatedData: any = {
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        sourceName: recipe.sourceName,
        sourceNotes: recipe.sourceNotes,
        ingredients: [...recipe.ingredients],
        instructions: [...recipe.instructions],
        tags: [...recipe.tags]
      }

      // Apply each change
      for (const change of approvedChanges) {
        switch (change.field) {
          case 'title':
          case 'description':
          case 'sourceName':
          case 'sourceNotes':
            if (change.type === 'modify') {
              updatedData[change.field] = change.newValue
            }
            break

          case 'prepTime':
          case 'cookTime':
          case 'servings':
            if (change.type === 'modify') {
              updatedData[change.field] = parseInt(change.newValue)
            }
            break

          case 'ingredients':
            if (change.type === 'add') {
              updatedData.ingredients.push(change.newValue)
            } else if (change.type === 'remove') {
              const index = updatedData.ingredients.findIndex((ing: any) => 
                ing.ingredient === change.oldValue.ingredient
              )
              if (index !== -1) {
                updatedData.ingredients.splice(index, 1)
              }
            } else if (change.type === 'modify') {
              const index = updatedData.ingredients.findIndex((ing: any) => 
                ing.ingredient === change.oldValue.ingredient
              )
              if (index !== -1) {
                updatedData.ingredients[index] = change.newValue
              }
            }
            break

          case 'instructions':
            if (change.type === 'add') {
              updatedData.instructions.push(change.newValue)
              // Renumber steps
              updatedData.instructions = updatedData.instructions.map((inst: any, i: number) => ({
                ...inst,
                stepNumber: i + 1
              }))
            } else if (change.type === 'remove') {
              const index = updatedData.instructions.findIndex((inst: any) => 
                inst.stepNumber === change.oldValue.stepNumber
              )
              if (index !== -1) {
                updatedData.instructions.splice(index, 1)
                // Renumber remaining steps
                updatedData.instructions = updatedData.instructions.map((inst: any, i: number) => ({
                  ...inst,
                  stepNumber: i + 1
                }))
              }
            } else if (change.type === 'modify') {
              const index = updatedData.instructions.findIndex((inst: any) => 
                inst.stepNumber === change.oldValue.stepNumber
              )
              if (index !== -1) {
                updatedData.instructions[index] = {
                  ...updatedData.instructions[index],
                  instruction: change.newValue.instruction || change.newValue
                }
              }
            }
            break

          case 'tags':
            if (change.type === 'modify') {
              updatedData.tags = Array.isArray(change.newValue) ? change.newValue : [change.newValue]
            } else if (change.type === 'add') {
              const newTag = Array.isArray(change.newValue) ? change.newValue[0] : change.newValue
              if (!updatedData.tags.includes(newTag)) {
                updatedData.tags.push(newTag)
              }
            }
            break

          case 'notes':
            if (change.type === 'modify') {
              updatedData.sourceNotes = change.newValue
            }
            break
        }
      }

      // Call the update function
      await onUpdate(updatedData)
      
      // Reset state
      setChanges([])
      setTranscript('')
      setShowReview(false)
      setIsOpen(false)
    } catch (err) {
      console.error('Error applying changes:', err)
      setError('Failed to apply changes. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleCancel = () => {
    setShowReview(false)
    setChanges([])
    setTranscript('')
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Mic className="h-4 w-4" />
        Talk to Recipe
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Talk to Your Recipe</DialogTitle>
            <DialogDescription>
              Use voice commands to modify your recipe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!showReview ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Speak naturally about what you'd like to change. For example:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>"Add more flour, about half a cup"</li>
                  <li>"Change the baking time to 25 minutes"</li>
                  <li>"Remove the vanilla extract"</li>
                  <li>"Add a note about room temperature eggs"</li>
                </ul>

                <VoiceRecorder
                  onTranscription={handleTranscription}
                  isProcessing={isProcessing}
                />

                {transcript && !isProcessing && !showReview && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">You said:</h4>
                      <p className="text-sm">{transcript}</p>
                    </div>
                  </Card>
                )}

                {isProcessing && (
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Understanding your request...</span>
                    </div>
                  </Card>
                )}

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
              </>
            ) : (
              <VoiceChangeReview
                changes={changes}
                onApprove={applyChanges}
                onCancel={handleCancel}
                isApplying={isApplying}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}