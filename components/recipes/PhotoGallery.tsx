'use client'

import { useState } from 'react'
import Image from 'next/image'
import { RecipePhoto } from '@/lib/types/recipe'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoGalleryProps {
  photos: RecipePhoto[]
  recipeTitle: string
}

export function PhotoGallery({ photos, recipeTitle }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    return null
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
  }

  const closeLightbox = () => {
    setSelectedIndex(null)
  }

  const goToPrevious = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length)
  }

  const goToNext = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex + 1) % photos.length)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return
    
    switch (e.key) {
      case 'ArrowLeft':
        goToPrevious()
        break
      case 'ArrowRight':
        goToNext()
        break
      case 'Escape':
        closeLightbox()
        break
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(index)}
            className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-lg overflow-hidden"
            aria-label={`View photo ${index + 1} of ${photos.length}`}
          >
            <div className="relative w-full h-64">
              <Image
                src={photo.photoUrl}
                alt={photo.caption || `${recipeTitle} - Photo ${index + 1}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            {photo.isOriginal && (
              <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                Original Recipe Card
              </span>
            )}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-white text-sm">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center print:hidden"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label="Photo lightbox"
          aria-modal="true"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrevious()
                }}
                className="absolute left-4 text-white hover:text-gray-300 p-2"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-4 text-white hover:text-gray-300 p-2"
                aria-label="Next photo"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <div
            className="relative max-w-7xl max-h-[90vh] px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[90vh]">
              <Image
                src={photos[selectedIndex].photoUrl}
                alt={photos[selectedIndex].caption || `${recipeTitle} - Photo ${selectedIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>
            {photos[selectedIndex].caption && (
              <p className="text-white text-center mt-4">{photos[selectedIndex].caption}</p>
            )}
            <p className="text-white/70 text-sm text-center mt-2">
              {selectedIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </>
  )
}