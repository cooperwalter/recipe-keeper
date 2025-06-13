import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoGallery } from './PhotoGallery'
import { RecipePhoto } from '@/lib/types/recipe'

const mockPhotos: RecipePhoto[] = [
  {
    id: '1',
    recipeId: 'recipe-1',
    photoUrl: 'https://example.com/photo1.jpg',
    isOriginal: false,
    caption: 'Finished dish',
    uploadedBy: 'user-1',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: '2',
    recipeId: 'recipe-1',
    photoUrl: 'https://example.com/photo2.jpg',
    isOriginal: true,
    caption: 'Original recipe card',
    uploadedBy: 'user-1',
    uploadedAt: new Date().toISOString(),
  },
]

describe('PhotoGallery', () => {
  it('renders nothing when no photos', () => {
    const { container } = render(<PhotoGallery photos={[]} recipeTitle="Test Recipe" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all photos in grid', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'https://example.com/photo1.jpg')
    expect(images[1]).toHaveAttribute('src', 'https://example.com/photo2.jpg')
  })

  it('shows original recipe card label', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    expect(screen.getByText('Original Recipe Card')).toBeInTheDocument()
  })

  it('displays photo captions', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    expect(screen.getByText('Finished dish')).toBeInTheDocument()
    expect(screen.getByText('Original recipe card')).toBeInTheDocument()
  })

  it('opens lightbox when photo clicked', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    const firstPhoto = screen.getByLabelText('View photo 1 of 2')
    fireEvent.click(firstPhoto)
    
    // Check lightbox is open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('closes lightbox when close button clicked', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    // Open lightbox
    fireEvent.click(screen.getByLabelText('View photo 1 of 2'))
    
    // Close lightbox
    fireEvent.click(screen.getByLabelText('Close lightbox'))
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates photos with arrow buttons', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    // Open lightbox
    fireEvent.click(screen.getByLabelText('View photo 1 of 2'))
    
    // Check initial state
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    
    // Go to next
    fireEvent.click(screen.getByLabelText('Next photo'))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    
    // Go to previous
    fireEvent.click(screen.getByLabelText('Previous photo'))
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('navigates photos with keyboard', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    // Open lightbox
    fireEvent.click(screen.getByLabelText('View photo 1 of 2'))
    
    const dialog = screen.getByRole('dialog')
    
    // Right arrow
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    
    // Left arrow
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    
    // Escape
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('wraps around when navigating past bounds', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    // Open lightbox on last photo
    fireEvent.click(screen.getByLabelText('View photo 2 of 2'))
    
    // Go to next (should wrap to first)
    fireEvent.click(screen.getByLabelText('Next photo'))
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    
    // Go to previous (should wrap to last)
    fireEvent.click(screen.getByLabelText('Previous photo'))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('prevents event propagation on image click in lightbox', () => {
    render(<PhotoGallery photos={mockPhotos} recipeTitle="Test Recipe" />)
    
    // Open lightbox
    fireEvent.click(screen.getByLabelText('View photo 1 of 2'))
    
    // Click on image should not close lightbox
    const lightboxImage = screen.getAllByRole('img')[2] // Third image is in lightbox
    fireEvent.click(lightboxImage)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('uses alt text fallback when no caption', () => {
    const photosWithoutCaption = [
      { ...mockPhotos[0], caption: undefined }
    ]
    
    render(<PhotoGallery photos={photosWithoutCaption} recipeTitle="Test Recipe" />)
    
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'Test Recipe - Photo 1')
  })
})