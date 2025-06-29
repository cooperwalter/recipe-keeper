'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ScanLine, PenTool, Camera, Mic, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewRecipePage() {
  const router = useRouter()
  const [touchedCard, setTouchedCard] = useState<string | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchStartTime = useRef<number | null>(null)
  const hasScrolled = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    hasScrolled.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)
      if (deltaY > 10) {
        hasScrolled.current = true
        setTouchedCard(null)
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent, cardId: string, href: string) => {
    const touchDuration = touchStartTime.current ? Date.now() - touchStartTime.current : 0
    
    if (!hasScrolled.current && touchDuration < 500) {
      // This was a tap, not a scroll
      e.preventDefault()
      router.push(href)
    }
    
    setTouchedCard(null)
    touchStartY.current = null
    touchStartTime.current = null
  }

  const recipes = [
    {
      id: 'ocr',
      href: '/protected/recipes/new/ocr',
      icon: ScanLine,
      title: 'Scan from Photo',
      description: 'Upload a photo and we\'ll extract the recipe',
      features: [
        { icon: Camera, text: 'Works with photos of recipe cards, handwritten notes, or screenshots' },
        { icon: '✓', text: 'AI-powered text extraction' },
        { icon: '✓', text: 'Review and edit before saving' },
      ]
    },
    {
      id: 'voice',
      href: '/protected/recipes/new/voice',
      icon: Mic,
      title: 'Speak Recipe',
      description: 'Describe your recipe out loud',
      features: [
        { icon: '✓', text: 'Just talk naturally about your recipe' },
        { icon: '✓', text: 'AI converts speech to recipe format' },
        { icon: '✓', text: 'Review and edit before saving' },
      ]
    },
    {
      id: 'url',
      href: '/protected/recipes/new/url',
      icon: LinkIcon,
      title: 'Import from URL',
      description: 'Extract recipe from any website',
      features: [
        { icon: '✓', text: 'Works with most recipe websites' },
        { icon: '✓', text: 'Automatically extracts ingredients & steps' },
        { icon: '✓', text: 'Preserves original source attribution' },
      ]
    },
    {
      id: 'manual',
      href: '/protected/recipes/new/manual',
      icon: PenTool,
      title: 'Type Manually',
      description: 'Enter your recipe details step by step',
      features: [
        { icon: '✓', text: 'Perfect for recipes you know by heart' },
        { icon: '✓', text: 'Full control over formatting' },
        { icon: '✓', text: 'Save drafts as you go' },
      ]
    }
  ]

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
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
        {recipes.map((recipe) => {
          const Icon = recipe.icon
          return (
            <div
              key={recipe.id}
              onClick={() => router.push(recipe.href)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, recipe.id, recipe.href)}
              className="cursor-pointer"
            >
              <Card className={`h-full transition-shadow border-2 ${
                touchedCard === recipe.id ? 'shadow-lg border-primary/50' : ''
              } md:hover:shadow-lg md:hover:border-primary/50`}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{recipe.title}</CardTitle>
                      <CardDescription>{recipe.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    {recipe.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        {typeof feature.icon === 'string' ? (
                          <span className="text-primary">{feature.icon}</span>
                        ) : (
                          <feature.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}