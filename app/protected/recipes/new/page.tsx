import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ScanLine, PenTool, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'New Recipe | Recipe Keeper',
  description: 'Add a new recipe to your collection',
}

export default function NewRecipePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/protected/recipes">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Recipes
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold">Add New Recipe</h1>
        <p className="text-muted-foreground mt-2">
          Choose how you&apos;d like to add your recipe
        </p>
      </div>

      {/* Options */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        <Link href="/protected/recipes/new/ocr">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <ScanLine className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle>Scan from Photo</CardTitle>
                  <CardDescription>Upload a photo and we&apos;ll extract the recipe</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Camera className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Works with photos of recipe cards, handwritten notes, or screenshots</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>AI-powered text extraction</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Review and edit before saving</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        <Link href="/protected/recipes/new/manual">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <PenTool className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle>Type Manually</CardTitle>
                  <CardDescription>Enter your recipe details step by step</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Perfect for recipes you know by heart</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Full control over formatting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Save drafts as you go</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}