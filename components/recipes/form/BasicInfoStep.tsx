'use client'

import { useRecipeForm } from './RecipeFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { RecipeCategory } from '@/lib/types/recipe'

export function BasicInfoStep() {
  const { formData, updateFormData } = useRecipeForm()
  const [categories, setCategories] = useState<RecipeCategory[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title">Recipe Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          placeholder="e.g., Grandma's Chocolate Chip Cookies"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="A brief description of your recipe"
          className="mt-1"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="prepTime">Prep Time (minutes)</Label>
          <Input
            id="prepTime"
            type="number"
            min="0"
            value={formData.prepTime || ''}
            onChange={(e) => updateFormData({ prepTime: e.target.value ? parseInt(e.target.value) : undefined })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="cookTime">Cook Time (minutes)</Label>
          <Input
            id="cookTime"
            type="number"
            min="0"
            value={formData.cookTime || ''}
            onChange={(e) => updateFormData({ cookTime: e.target.value ? parseInt(e.target.value) : undefined })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="servings">Servings</Label>
          <Input
            id="servings"
            type="number"
            min="1"
            value={formData.servings || ''}
            onChange={(e) => updateFormData({ servings: e.target.value ? parseInt(e.target.value) : undefined })}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.categoryIds[0] || ''}
          onValueChange={(value) => updateFormData({ categoryIds: value ? [value] : [] })}
        >
          <SelectTrigger id="category" className="mt-1">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


      <div>
        <Label htmlFor="sourceName">Recipe Source</Label>
        <Input
          id="sourceName"
          value={formData.sourceName || ''}
          onChange={(e) => updateFormData({ sourceName: e.target.value })}
          placeholder="e.g., Grandma Rose, Mom, Aunt Sally"
          className="mt-1"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isPublic"
          checked={formData.isPublic}
          onCheckedChange={(checked) => updateFormData({ isPublic: checked })}
        />
        <Label htmlFor="isPublic" className="cursor-pointer">
          Make this recipe public
        </Label>
      </div>
    </div>
  )
}