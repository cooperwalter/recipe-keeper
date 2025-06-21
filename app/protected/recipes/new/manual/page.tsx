import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { RecipeFormProvider } from '@/components/recipes/form/RecipeFormContext'
import { RecipeFormWizard } from '@/components/recipes/form/RecipeFormWizard'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'New Recipe | Recipe and Me',
  description: 'Add a new recipe to your collection',
}

export default function ManualRecipePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/protected/recipes/new">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Recipe Options
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold">Add New Recipe</h1>
        <p className="text-muted-foreground mt-2">
          Share a family recipe and preserve it for future generations
        </p>
      </div>

      {/* Form */}
      <RecipeFormProvider>
        <RecipeFormWizard />
      </RecipeFormProvider>
    </div>
  )
}