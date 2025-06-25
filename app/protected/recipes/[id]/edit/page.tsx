'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { RecipeWithRelations } from '@/lib/types/recipe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Loader2,
  Save
} from 'lucide-react'
import Link from 'next/link'
import { VoiceToRecipe } from '@/components/recipe/voice-to-recipe'
import { useQueryClient } from '@tanstack/react-query'
import { recipeKeys } from '@/lib/hooks/use-recipes'
import { RecipeEditSkeleton } from '@/components/ui/recipe-skeletons'

interface EditRecipePageProps {
  params: Promise<{ id: string }>
}

interface EditableIngredient {
  id?: string
  ingredient: string
  amount?: string
  unit?: string
  notes?: string
}

interface EditableInstruction {
  id?: string
  instruction: string
  stepNumber: number
}

export default function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [recipe, setRecipe] = useState<RecipeWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceNotes, setSourceNotes] = useState('')
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([])
  const [instructions, setInstructions] = useState<EditableInstruction[]>([])

  useEffect(() => {
    fetchRecipe()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/protected/recipes')
          return
        }
        throw new Error('Failed to fetch recipe')
      }
      
      const data: RecipeWithRelations = await response.json()
      setRecipe(data)
      
      // Initialize form state
      setTitle(data.title)
      setDescription(data.description || '')
      setPrepTime(data.prepTime?.toString() || '')
      setCookTime(data.cookTime?.toString() || '')
      setServings(data.servings?.toString() || '')
      setSourceName(data.sourceName || '')
      setSourceNotes(data.sourceNotes || '')
      setIngredients(data.ingredients.map(ing => ({
        id: ing.id,
        ingredient: ing.ingredient,
        amount: ing.amount?.toString() || '',
        unit: ing.unit || '',
        notes: ing.notes || ''
      })))
      setInstructions(data.instructions.map(inst => ({
        id: inst.id,
        instruction: inst.instruction,
        stepNumber: inst.stepNumber
      })))
    } catch (error) {
      console.error('Error fetching recipe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceUpdate = async (updatedData: RecipeWithRelations) => {
    // Apply voice changes to the form state
    setTitle(updatedData.title)
    setDescription(updatedData.description || '')
    setPrepTime(updatedData.prepTime?.toString() || '')
    setCookTime(updatedData.cookTime?.toString() || '')
    setServings(updatedData.servings?.toString() || '')
    setSourceName(updatedData.sourceName || '')
    setSourceNotes(updatedData.sourceNotes || '')
    setIngredients(updatedData.ingredients.map((ing) => ({
      ingredient: ing.ingredient,
      amount: ing.amount ? String(ing.amount) : '',
      unit: ing.unit || '',
      notes: ing.notes || ''
    })))
    setInstructions(updatedData.instructions.map((inst) => ({
      instruction: inst.instruction,
      stepNumber: inst.stepNumber
    })))
    
    // Auto-save after voice update
    await handleSave(updatedData)
  }

  const handleSave = async (dataOverride?: RecipeWithRelations) => {
    if (!recipe) return
    
    setIsSaving(true)
    try {
      const dataToSave = dataOverride || {
        title,
        description: description || undefined,
        prepTime: prepTime ? parseInt(prepTime) : undefined,
        cookTime: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        sourceName: sourceName || undefined,
        sourceNotes: sourceNotes || undefined,
        ingredients: ingredients.map((ing, index) => ({
          ingredient: ing.ingredient,
          amount: ing.amount || undefined,
          unit: ing.unit || undefined,
          notes: ing.notes || undefined,
          orderIndex: index
        })),
        instructions: instructions.map((inst, index) => ({
          instruction: inst.instruction,
          stepNumber: index + 1
        })),
      }
      
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })
      
      if (!response.ok) throw new Error('Failed to update recipe')
      
      // Invalidate the cache for this recipe and the recipes list
      await queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) })
      await queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      
      router.push(`/protected/recipes/${id}`)
    } catch (error) {
      console.error('Error updating recipe:', error)
      alert('Failed to update recipe. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!recipe) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete recipe')
      }
      
      router.push('/protected/recipes')
    } catch (error) {
      console.error('Error deleting recipe:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete recipe'
      
      // Show more helpful error messages
      if (errorMessage.includes('Not authorized')) {
        alert('You can only delete recipes that you created.')
      } else if (errorMessage.includes('not found')) {
        alert('This recipe no longer exists.')
      } else {
        alert(`Failed to delete recipe: ${errorMessage}`)
      }
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { ingredient: '', amount: '', unit: '', notes: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof EditableIngredient, value: string) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const addInstruction = () => {
    setInstructions([...instructions, { instruction: '', stepNumber: instructions.length + 1 }])
  }

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index))
  }

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions]
    updated[index] = { ...updated[index], instruction: value }
    setInstructions(updated)
  }


  if (isLoading) {
    return <RecipeEditSkeleton />
  }

  if (!recipe) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Recipe not found</h1>
        <Link href="/protected/recipes">
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Recipes
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back Button */}
      <div className="mb-6">
        <Link href={`/protected/recipes/${id}`}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Recipe
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Edit Recipe</h1>
        <div className="flex flex-wrap gap-2">
          <VoiceToRecipe 
            recipe={recipe} 
            onUpdate={handleVoiceUpdate}
          />
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={() => handleSave()} disabled={isSaving || !title.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Recipe Title*</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter recipe title"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the recipe"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prepTime">Prep Time (minutes)</Label>
              <Input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15"
              />
            </div>
            
            <div>
              <Label htmlFor="cookTime">Cook Time (minutes)</Label>
              <Input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30"
              />
            </div>
            
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sourceName">Recipe Source</Label>
            <Input
              id="sourceName"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="Grandma Mary"
            />
          </div>

          <div>
            <Label htmlFor="sourceNotes">Family Notes & Memories</Label>
            <Textarea
              id="sourceNotes"
              value={sourceNotes}
              onChange={(e) => setSourceNotes(e.target.value)}
              placeholder="Share any stories or memories about this recipe..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={ingredient.amount}
                  onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                  placeholder="Amount"
                  className="w-full sm:w-24"
                />
                <Input
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="w-full sm:w-32"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={ingredient.ingredient}
                  onChange={(e) => updateIngredient(index, 'ingredient', e.target.value)}
                  placeholder="Ingredient"
                  className="flex-1"
                />
                <Input
                  value={ingredient.notes}
                  onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                  placeholder="Notes (optional)"
                  className="flex-1 sm:w-48"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeIngredient(index)}
                  aria-label="Remove ingredient"
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button onClick={addIngredient} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {instructions.map((instruction, index) => (
            <div key={index} className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <Textarea
                value={instruction.instruction}
                onChange={(e) => updateInstruction(index, e.target.value)}
                placeholder={`Step ${index + 1}`}
                rows={2}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeInstruction(index)}
                aria-label="Remove instruction"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button onClick={addInstruction} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </CardContent>
      </Card>


      {/* Delete Button */}
      <div className="mt-8">
        <Button 
          variant="outline" 
          size="lg"
          className="w-full sm:w-[calc(100%-2rem)] mx-auto flex items-center justify-center gap-2 text-destructive border-destructive hover:bg-destructive/10 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-400/20"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
        >
          <Trash2 className="h-5 w-5" />
          Delete This Recipe
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}