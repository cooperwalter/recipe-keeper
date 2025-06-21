import { Suspense } from 'react'
import RecipesServer from './recipes-server'
import { RecipesPageSkeleton } from './recipes-loading'

interface RecipesPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    page?: string
    view?: string
  }>
}

export default function RecipesPage({ searchParams }: RecipesPageProps) {
  return (
    <Suspense fallback={<RecipesPageSkeleton />}>
      <RecipesServer searchParams={searchParams} />
    </Suspense>
  )
}