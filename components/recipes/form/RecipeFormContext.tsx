'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { CreateRecipeInput, CreateIngredientInput, CreateInstructionInput } from '@/lib/types/recipe'

interface RecipeFormData extends CreateRecipeInput {
  ingredients: Omit<CreateIngredientInput, 'recipeId'>[]
  instructions: Omit<CreateInstructionInput, 'recipeId'>[]
  categoryIds: string[]
  tags: string[]
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
  const [formData, setFormData] = useState<RecipeFormData>({
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
    tags: [],
    photos: [],
    ...initialData,
  })

  const [currentStep, setCurrentStep] = useState(0)

  const updateFormData = (data: Partial<RecipeFormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

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
      }}
    >
      {children}
    </RecipeFormContext.Provider>
  )
}