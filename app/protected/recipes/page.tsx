import { Suspense } from 'react'
import RecipesServer from './recipes-server'

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
    <Suspense fallback={<div>Loading...</div>}>
      <RecipesServer searchParams={searchParams} />
    </Suspense>
  )
}