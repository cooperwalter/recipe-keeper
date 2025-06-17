'use client'

import { useState, useEffect, use } from 'react'
import { RecipeVersion } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ChevronLeft,
  Clock,
  Users,
  User,
  RotateCcw,
  GitCompare
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface VersionPageProps {
  params: Promise<{ 
    id: string
    versionNumber: string 
  }>
}

export default function RecipeVersionPage({ params }: VersionPageProps) {
  const { id, versionNumber } = use(params)
  const router = useRouter()
  const [version, setVersion] = useState<RecipeVersion | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchVersion()
  }, [id, versionNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVersion = async () => {
    try {
      const response = await fetch(`/api/recipes/${id}/versions/${versionNumber}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push(`/protected/recipes/${id}`)
          return
        }
        throw new Error('Failed to fetch version')
      }
      
      const data = await response.json()
      setVersion(data)
    } catch (error) {
      console.error('Error fetching version:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading version...</div>
      </div>
    )
  }

  if (!version) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Version not found</h1>
        <Link href={`/protected/recipes/${id}`}>
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Recipe
          </Button>
        </Link>
      </div>
    )
  }

  interface VersionRecipeData {
    title: string
    description?: string
    prepTime?: number
    cookTime?: number
    servings?: number
    sourceName?: string
    sourceNotes?: string
    tags?: string[]
    ingredients: Array<{
      amount?: string | number
      unit?: string
      ingredient: string
      notes?: string
    }>
    instructions: Array<{
      stepNumber: number
      instruction: string
    }>
  }

  const recipeData = version.recipeData as VersionRecipeData

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/protected/recipes/${id}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Current Recipe
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{recipeData.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Version {version.versionNumber}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(version.changedAt), 'MMMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/protected/recipes/${id}/versions/${version.versionNumber}/restore`}>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restore This Version
                  </Button>
                </Link>
                <Link href={`/protected/recipes/${id}/versions/compare?v1=${version.versionNumber}&v2=current`}>
                  <Button variant="outline" size="sm">
                    <GitCompare className="h-4 w-4 mr-1" />
                    Compare with Current
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {version.changeSummary || 'Recipe updated'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recipe Content */}
      <div className="space-y-8">
        {/* Description and metadata */}
        {recipeData.description && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-muted-foreground">{recipeData.description}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {(recipeData.prepTime || recipeData.cookTime) && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {recipeData.prepTime ? `${recipeData.prepTime} min prep` : ''}
                {recipeData.prepTime && recipeData.cookTime ? ' + ' : ''}
                {recipeData.cookTime ? `${recipeData.cookTime} min cook` : ''}
              </span>
            </div>
          )}
          {recipeData.servings && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{recipeData.servings} servings</span>
            </div>
          )}
          {recipeData.sourceName && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>From {recipeData.sourceName}</span>
            </div>
          )}
        </div>

        {recipeData.tags && recipeData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipeData.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {recipeData.sourceNotes && (
          <div className="p-6 bg-muted/50 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Family Notes & Memories</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{recipeData.sourceNotes}</p>
          </div>
        )}

        <Separator />

        {/* Ingredients and Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipeData.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    {ingredient.amount && `${ingredient.amount} `}
                    {ingredient.unit && `${ingredient.unit} `}
                    {ingredient.ingredient}
                    {ingredient.notes && (
                      <span className="text-muted-foreground"> ({ingredient.notes})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipeData.instructions.map((instruction, index) => (
                <li key={index} className="flex">
                  <span className="mr-4 flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {instruction.stepNumber}
                  </span>
                  <p className="pt-1">{instruction.instruction}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}