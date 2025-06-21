'use client'

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import { CreateRecipeInput, CreateIngredientInput, CreateInstructionInput } from '@/lib/types/recipe'
import { draftPersistence } from '@/lib/utils/draft-persistence'

export interface RecipeFormData extends CreateRecipeInput {
  ingredients: Omit<CreateIngredientInput, 'recipeId'>[]
  instructions: Omit<CreateInstructionInput, 'recipeId'>[]
  categoryIds: string[]
  // tags: string[]  // Tags feature temporarily disabled
  photos: File[]
}

interface RecipeFormContextType {
  formData: RecipeFormData
  updateFormData: (data: Partial<RecipeFormData>) => void
  currentStep: number
  setCurrentStep: (step: number) => void
  nextStep: () => void
  previousStep: () => void
  isValid: (step: number) => boolean
  clearDraft: () => void
  draftSavedAt: Date | null
}

const RecipeFormContext = createContext<RecipeFormContextType | undefined>(undefined)

export function useRecipeForm() {
  const context = useContext(RecipeFormContext)
  if (!context) {
    throw new Error('useRecipeForm must be used within RecipeFormProvider')
  }
  return context
}

interface RecipeFormProviderProps {
  children: ReactNode
  initialData?: Partial<RecipeFormData>
}

export function RecipeFormProvider({ children, initialData }: RecipeFormProviderProps) {
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize form data, checking for draft first
  const [formData, setFormData] = useState<RecipeFormData>(() => {
    const defaultData: RecipeFormData = {
      title: '',
      description: '',
      prepTime: undefined,
      cookTime: undefined,
      servings: undefined,
      isPublic: false,
      sourceName: '',
      sourceNotes: '',
      ingredients: [],
      instructions: [],
      categoryIds: [],
      // tags: [],  // Tags feature temporarily disabled
      photos: [],
      ...initialData,
    }
    
    return defaultData
  })

  const [currentStep, setCurrentStep] = useState(0)

  // Load draft on mount (only if no initialData provided)
  useEffect(() => {
    if (!initialData && !isInitialized) {
      const draft = draftPersistence.load()
      if (draft) {
        setFormData(draft)
        setDraftSavedAt(draftPersistence.getTimestamp())
      }
      setIsInitialized(true)
    }
  }, [initialData, isInitialized])

  // Save draft whenever form data changes (debounced)
  useEffect(() => {
    if (!isInitialized) return
    
    const timeoutId = setTimeout(() => {
      draftPersistence.save(formData)
      setDraftSavedAt(new Date())
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [formData, isInitialized])

  const updateFormData = useCallback((data: Partial<RecipeFormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }, [])

  const clearDraft = useCallback(() => {
    draftPersistence.clear()
    setDraftSavedAt(null)
  }, [])

  const nextStep = () => {
    if (isValid(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const previousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const isValid = (step: number): boolean => {
    switch (step) {
      case 0: // Basic info
        return formData.title.trim().length > 0
      case 1: // Ingredients
        return formData.ingredients.length > 0 && 
               formData.ingredients.every(ing => ing.ingredient.trim().length > 0)
      case 2: // Instructions
        return formData.instructions.length > 0 &&
               formData.instructions.every(inst => inst.instruction.trim().length > 0)
      case 3: // Photos & Notes
        return true // Optional step
      default:
        return false
    }
  }

  return (
    <RecipeFormContext.Provider
      value={{
        formData,
        updateFormData,
        currentStep,
        setCurrentStep,
        nextStep,
        previousStep,
        isValid,
        clearDraft,
        draftSavedAt,
      }}
    >
      {children}
    </RecipeFormContext.Provider>
  )
}