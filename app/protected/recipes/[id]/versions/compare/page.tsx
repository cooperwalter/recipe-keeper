'use client'

import { use, Suspense } from 'react'
import { VersionDiffViewer } from '@/components/recipe/version-diff-viewer'
import { Button } from '@/components/ui/button'
import { VersionComparisonSkeleton } from '@/components/ui/recipe-skeletons'
import { 
  ChevronLeft
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface ComparePageProps {
  params: Promise<{ id: string }>
}

function ComparePageContent({ params }: ComparePageProps) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const v1 = searchParams.get('v1')
  const v2 = searchParams.get('v2')

  if (!v1 || !v2) {
    return (
      <div className="container mx-auto py-8 px-4 text-center animate-fade-in">
        <h1 className="text-2xl font-bold mb-4">Invalid comparison parameters</h1>
        <p className="text-muted-foreground mb-4">
          Please specify two version numbers to compare.
        </p>
        <Link href={`/protected/recipes/${id}`}>
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Recipe
          </Button>
        </Link>
      </div>
    )
  }

  // Convert "current" to the actual current version number if needed
  // For now, we'll handle this in the component
  const version1 = v1 === 'current' ? -1 : parseInt(v1)
  const version2 = v2 === 'current' ? -1 : parseInt(v2)

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      <div className="mb-8">
        <Link href={`/protected/recipes/${id}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Recipe
          </Button>
        </Link>
      </div>

      <VersionDiffViewer
        recipeId={id}
        version1Number={version1}
        version2Number={version2}
      />
    </div>
  )
}

export default function RecipeVersionComparePage({ params }: ComparePageProps) {
  return (
    <Suspense fallback={<VersionComparisonSkeleton />}>
      <ComparePageContent params={params} />
    </Suspense>
  )
}