'use client'

import { useRecipeForm } from './RecipeFormContext'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X } from 'lucide-react'
import { useRef } from 'react'
import Image from 'next/image'

export function PhotosNotesStep() {
  const { formData, updateFormData } = useRecipeForm()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    )
    
    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only images under 10MB are allowed.')
    }
    
    updateFormData({ photos: [...formData.photos, ...validFiles] })
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    updateFormData({ 
      photos: formData.photos.filter((_, i) => i !== index) 
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>Recipe Photos</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Add photos of your finished dish or the original recipe card
        </p>

        <div className="space-y-3">
          {formData.photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <div className="relative w-full h-32 rounded-lg overflow-hidden">
                    <Image
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="p-3 bg-muted rounded-full mb-2">
                <Upload className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">Click to upload photos</span>
              <span className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, WebP or GIF (max 10MB each)
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="sourceNotes">Family Notes & Memories</Label>
        <Textarea
          id="sourceNotes"
          value={formData.sourceNotes || ''}
          onChange={(e) => updateFormData({ sourceNotes: e.target.value })}
          placeholder="Share any stories, memories, or special notes about this recipe..."
          className="mt-1"
          rows={4}
        />
        <p className="text-sm text-muted-foreground mt-1">
          This is a great place to preserve the history and memories associated with this recipe
        </p>
      </div>
    </div>
  )
}