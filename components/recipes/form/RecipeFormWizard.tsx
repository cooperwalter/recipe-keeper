'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRecipeForm } from './RecipeFormContext'
import { BasicInfoStep } from './BasicInfoStep'
import { IngredientsStep } from './IngredientsStep'
import { InstructionsStep } from './InstructionsStep'
import { PhotosNotesStep } from './PhotosNotesStep'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Loader2, Save, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StorageService } from '@/lib/supabase/storage'

const steps = [
  { title: 'Basic Info', description: 'Title, times, and categories' },
  { title: 'Ingredients', description: 'What goes in your recipe' },
  { title: 'Instructions', description: 'How to make it' },
  { title: 'Photos & Notes', description: 'Add images and memories' },
]

export function RecipeFormWizard() {
  const router = useRouter()
  const { formData, currentStep, nextStep, previousStep, isValid, clearDraft, draftSavedAt } = useRecipeForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare the data
      const recipeData = {
        title: formData.title,
        description: formData.description,
        prepTime: formData.prepTime,
        cookTime: formData.cookTime,
        servings: formData.servings,
        isPublic: formData.isPublic,
        sourceName: formData.sourceName,
        sourceNotes: formData.sourceNotes,
        ingredients: formData.ingredients,
        // Extract just the instruction text from the objects
        instructions: formData.instructions.map(inst => inst.instruction),
        categoryIds: formData.categoryIds,
        tags: formData.tags,
      }

      // Create the recipe
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData),
      })

      if (!response.ok) {
        throw new Error('Failed to create recipe')
      }

      const recipe = await response.json()

      // Upload photos if any
      if (formData.photos.length > 0) {
        const storageService = new StorageService()
        
        for (const photo of formData.photos) {
          try {
            const photoUrl = await storageService.uploadRecipePhoto(recipe.id, photo)
            
            // Save photo record
            await fetch(`/api/recipes/${recipe.id}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ photoUrl, isOriginal: false }),
            })
          } catch (error) {
            console.error('Error uploading photo:', error)
          }
        }
      }

      // Clear draft after successful submission
      clearDraft()
      
      // Navigate to the new recipe
      router.push(`/protected/recipes/${recipe.id}`)
    } catch (error) {
      console.error('Error creating recipe:', error)
      setError('Failed to create recipe. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" aria-valuenow={progress} />
        <div className="grid grid-cols-4 gap-2 mt-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                'text-center',
                index === currentStep && 'font-medium',
                index < currentStep && 'text-primary',
                index > currentStep && 'text-muted-foreground'
              )}
            >
              <div className="text-sm">{step.title}</div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                {step.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Steps */}
      <div className="bg-card rounded-lg p-6 mb-6">
        {currentStep === 0 && <BasicInfoStep />}
        {currentStep === 1 && <IngredientsStep />}
        {currentStep === 2 && <InstructionsStep />}
        {currentStep === 3 && <PhotosNotesStep />}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-6">
          {error}
        </div>
      )}

      {/* Draft Status */}
      {draftSavedAt && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Check className="h-4 w-4 text-green-600" />
          <span>Draft saved {draftSavedAt.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={previousStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!isValid(currentStep)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isValid(currentStep)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Create Recipe
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}