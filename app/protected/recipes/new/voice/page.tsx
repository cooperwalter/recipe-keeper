import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { VoiceRecipeFlow } from '@/components/recipe/voice-recipe-flow'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Speak a Recipe | Recipe and Me',
  description: 'Create a new recipe by speaking',
}

export default function VoiceRecipePage() {
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
        
        <h1 className="text-3xl font-bold">Speak Your Recipe</h1>
        <p className="text-muted-foreground mt-2">
          Describe your recipe out loud and we&apos;ll help you create it
        </p>
      </div>

      {/* Voice Flow */}
      <VoiceRecipeFlow />
    </div>
  )
}