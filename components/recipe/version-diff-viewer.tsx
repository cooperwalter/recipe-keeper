'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ArrowRight, Plus, Minus } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { RecipeVersion } from '@/lib/db/schema'

interface VersionDiffViewerProps {
  recipeId: string
  version1Number: number
  version2Number: number
}

interface Difference {
  field: string
  oldValue: unknown
  newValue: unknown
}

interface ComparisonData {
  version1: RecipeVersion | null
  version2: RecipeVersion | null
  differences: Difference[]
}

export function VersionDiffViewer({
  recipeId,
  version1Number,
  version2Number,
}: VersionDiffViewerProps) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchComparison = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/recipes/${recipeId}/versions/compare?v1=${version1Number}&v2=${version2Number}`
      )
      if (!response.ok) throw new Error('Failed to compare versions')
      const data = await response.json()
      setComparison(data)
    } catch (error) {
      console.error('Error comparing versions:', error)
    } finally {
      setLoading(false)
    }
  }, [recipeId, version1Number, version2Number])

  useEffect(() => {
    fetchComparison()
  }, [fetchComparison])


  const renderFieldDiff = (diff: Difference) => {
    const { field, oldValue, newValue } = diff

    // Handle different field types
    if (field === 'ingredients' || field === 'instructions' || field === 'tags') {
      return renderArrayDiff(field, oldValue as unknown[], newValue as unknown[])
    }

    // Simple field diff
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
            <div className="flex items-center gap-2 mb-1">
              <Minus className="h-3 w-3 text-red-600" />
              <span className="text-xs font-medium text-red-600">Removed</span>
            </div>
            <p className="text-sm">{String(oldValue || 'None')}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
            <div className="flex items-center gap-2 mb-1">
              <Plus className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">Added</span>
            </div>
            <p className="text-sm">{String(newValue || 'None')}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderArrayDiff = (field: string, oldArray: unknown[], newArray: unknown[]) => {
    const oldItems = oldArray || []
    const newItems = newArray || []

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium capitalize">{field}</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-red-600">
                {version1Number === -1 ? 'Current' : `Version ${version1Number}`}
              </Badge>
            </div>
            {oldItems.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border p-2 text-sm"
                style={{
                  backgroundColor: !newItems.some((newItem: unknown) => 
                    JSON.stringify(newItem) === JSON.stringify(item)
                  ) ? 'hsl(var(--destructive) / 0.1)' : undefined
                }}
              >
                {field === 'ingredients' && typeof item === 'object' && item !== null && 'ingredient' in item ? 
                  `${(item as {amount?: string | number; unit?: string; ingredient: string}).amount || ''} ${(item as {amount?: string | number; unit?: string; ingredient: string}).unit || ''} ${(item as {amount?: string | number; unit?: string; ingredient: string}).ingredient}`.trim() :
                 field === 'instructions' && typeof item === 'object' && item !== null && 'instruction' in item ? 
                  `${(item as {stepNumber: number; instruction: string}).stepNumber}. ${(item as {stepNumber: number; instruction: string}).instruction}` :
                 String(item)}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-green-600">
                {version2Number === -1 ? 'Current' : `Version ${version2Number}`}
              </Badge>
            </div>
            {newItems.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border p-2 text-sm"
                style={{
                  backgroundColor: !oldItems.some((oldItem: unknown) => 
                    JSON.stringify(oldItem) === JSON.stringify(item)
                  ) ? 'hsl(142 76% 36% / 0.1)' : undefined
                }}
              >
                {field === 'ingredients' && typeof item === 'object' && item !== null && 'ingredient' in item ? 
                  `${(item as {amount?: string | number; unit?: string; ingredient: string}).amount || ''} ${(item as {amount?: string | number; unit?: string; ingredient: string}).unit || ''} ${(item as {amount?: string | number; unit?: string; ingredient: string}).ingredient}`.trim() :
                 field === 'instructions' && typeof item === 'object' && item !== null && 'instruction' in item ? 
                  `${(item as {stepNumber: number; instruction: string}).stepNumber}. ${(item as {stepNumber: number; instruction: string}).instruction}` :
                 String(item)}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Loading comparison...</div>
  }

  if (!comparison || !comparison.version1 || !comparison.version2) {
    return <div className="text-center py-8">Unable to load version comparison</div>
  }

  const { version1, version2, differences } = comparison

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Version Comparison
          <Badge variant="outline">{version1Number === -1 ? 'Current' : `v${version1.versionNumber}`}</Badge>
          <ArrowRight className="h-4 w-4" />
          <Badge variant="outline">{version2Number === -1 ? 'Current' : `v${version2.versionNumber}`}</Badge>
        </CardTitle>
        <CardDescription>
          Comparing changes between {version1Number === -1 ? 'current version' : `version ${version1.versionNumber}`} and {version2Number === -1 ? 'current version' : `version ${version2.versionNumber}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{version1Number === -1 ? 'Current Version' : `Version ${version1.versionNumber}`}</p>
              <p className="font-medium">{format(new Date(version1.changedAt), 'MMM d, yyyy h:mm a')}</p>
              <p className="text-muted-foreground">{version1.changeSummary || 'Recipe updated'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{version2Number === -1 ? 'Current Version' : `Version ${version2.versionNumber}`}</p>
              <p className="font-medium">{format(new Date(version2.changedAt), 'MMM d, yyyy h:mm a')}</p>
              <p className="text-muted-foreground">{version2.changeSummary || 'Recipe updated'}</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {differences.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No differences found between these versions
          </p>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Changes ({differences.length})</TabsTrigger>
              <TabsTrigger value="sidebyside">Side by Side</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {differences.map((diff, index) => (
                    <div key={index}>
                      {renderFieldDiff(diff)}
                      {index < differences.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="sidebyside">
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Badge variant="outline">{version1Number === -1 ? 'Current' : `Version ${version1.versionNumber}`}</Badge>
                    </h3>
                    {renderVersionData(version1.recipeData)}
                  </div>
                  <div>
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Badge variant="outline">{version2Number === -1 ? 'Current' : `Version ${version2.versionNumber}`}</Badge>
                    </h3>
                    {renderVersionData(version2.recipeData)}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

interface VersionData {
  title: string
  description?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  ingredients?: Array<{
    amount?: string | number
    unit?: string
    ingredient: string
  }>
  instructions?: Array<{
    stepNumber: number
    instruction: string
  }>
}

function renderVersionData(data: unknown) {
  const versionData = data as VersionData
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-medium">Title</p>
        <p className="text-muted-foreground">{versionData.title}</p>
      </div>
      {versionData.description && (
        <div>
          <p className="font-medium">Description</p>
          <p className="text-muted-foreground">{versionData.description}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {versionData.prepTime && (
          <div>
            <p className="font-medium">Prep Time</p>
            <p className="text-muted-foreground">{versionData.prepTime} min</p>
          </div>
        )}
        {versionData.cookTime && (
          <div>
            <p className="font-medium">Cook Time</p>
            <p className="text-muted-foreground">{versionData.cookTime} min</p>
          </div>
        )}
      </div>
      {versionData.servings && (
        <div>
          <p className="font-medium">Servings</p>
          <p className="text-muted-foreground">{versionData.servings}</p>
        </div>
      )}
      {versionData.ingredients && versionData.ingredients.length > 0 && (
        <div>
          <p className="font-medium mb-2">Ingredients</p>
          <ul className="space-y-1">
            {versionData.ingredients.map((ing, i) => (
              <li key={i} className="text-muted-foreground">
                • {ing.amount || ''} {ing.unit || ''} {ing.ingredient}
              </li>
            ))}
          </ul>
        </div>
      )}
      {versionData.instructions && versionData.instructions.length > 0 && (
        <div>
          <p className="font-medium mb-2">Instructions</p>
          <ol className="space-y-1">
            {versionData.instructions.map((inst, i) => (
              <li key={i} className="text-muted-foreground">
                {inst.stepNumber}. {inst.instruction}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}