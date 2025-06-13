import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotosNotesStep } from './PhotosNotesStep'
import { RecipeFormProvider, useRecipeForm } from './RecipeFormContext'

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')

// Mock alert
global.alert = vi.fn()

// Test component to access form data
function TestComponent() {
  const { formData } = useRecipeForm()
  return (
    <div>
      <div data-testid="photos-count">{formData.photos.length}</div>
      <div data-testid="source-notes">{formData.sourceNotes || ''}</div>
    </div>
  )
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RecipeFormProvider>
      {children}
      <TestComponent />
    </RecipeFormProvider>
  )
}

describe('PhotosNotesStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithProvider = () => {
    return render(
      <TestWrapper>
        <PhotosNotesStep />
      </TestWrapper>
    )
  }

  const createMockFile = (name: string, type: string = 'image/jpeg', size: number = 1024): File => {
    const file = new File([''], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  it('renders photo upload and notes sections', () => {
    renderWithProvider()
    
    expect(screen.getByText('Recipe Photos')).toBeInTheDocument()
    expect(screen.getByText('Add photos of your finished dish or the original recipe card')).toBeInTheDocument()
    expect(screen.getByLabelText('Family Notes & Memories')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Share any stories, memories, or special notes about this recipe...'))
      .toBeInTheDocument()
  })

  it('handles photo upload', async () => {
    renderWithProvider()
    
    const file = createMockFile('test-photo.jpg')
    const input = screen.getByLabelText('Click to upload photos')
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByTestId('photos-count')).toHaveTextContent('1')
      expect(screen.getByAltText('Photo 1')).toBeInTheDocument()
    })
  })

  it('handles multiple photo uploads', async () => {
    renderWithProvider()
    
    const files = [
      createMockFile('photo1.jpg'),
      createMockFile('photo2.jpg'),
      createMockFile('photo3.jpg'),
    ]
    const input = screen.getByLabelText('Click to upload photos')
    
    fireEvent.change(input, { target: { files } })
    
    await waitFor(() => {
      expect(screen.getByTestId('photos-count')).toHaveTextContent('3')
      expect(screen.getByAltText('Photo 1')).toBeInTheDocument()
      expect(screen.getByAltText('Photo 2')).toBeInTheDocument()
      expect(screen.getByAltText('Photo 3')).toBeInTheDocument()
    })
  })

  it('filters out non-image files', async () => {
    renderWithProvider()
    
    const files = [
      createMockFile('photo.jpg', 'image/jpeg'),
      createMockFile('document.pdf', 'application/pdf'),
      createMockFile('text.txt', 'text/plain'),
    ]
    const input = screen.getByLabelText('Click to upload photos')
    
    fireEvent.change(input, { target: { files } })
    
    await waitFor(() => {
      expect(screen.getByTestId('photos-count')).toHaveTextContent('1')
      expect(global.alert).toHaveBeenCalledWith('Some files were skipped. Only images under 10MB are allowed.')
    })
  })

  it('filters out large files', async () => {
    renderWithProvider()
    
    const files = [
      createMockFile('small.jpg', 'image/jpeg', 5 * 1024 * 1024), // 5MB
      createMockFile('large.jpg', 'image/jpeg', 15 * 1024 * 1024), // 15MB
    ]
    const input = screen.getByLabelText('Click to upload photos')
    
    fireEvent.change(input, { target: { files } })
    
    await waitFor(() => {
      expect(screen.getByTestId('photos-count')).toHaveTextContent('1')
      expect(global.alert).toHaveBeenCalledWith('Some files were skipped. Only images under 10MB are allowed.')
    })
  })

  it('removes a photo', async () => {
    renderWithProvider()
    
    // Add photo
    const file = createMockFile('test-photo.jpg')
    const input = screen.getByLabelText('Click to upload photos')
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByTestId('photos-count')).toHaveTextContent('1')
    })
    
    // Remove photo
    const removeButton = screen.getByLabelText('Remove photo')
    fireEvent.click(removeButton)
    
    expect(screen.getByTestId('photos-count')).toHaveTextContent('0')
    expect(screen.queryByAltText('Photo 1')).not.toBeInTheDocument()
  })

  it('updates source notes', () => {
    renderWithProvider()
    
    const notesTextarea = screen.getByLabelText('Family Notes & Memories')
    fireEvent.change(notesTextarea, { 
      target: { value: 'This was my grandmother\'s favorite recipe' } 
    })
    
    expect(screen.getByTestId('source-notes')).toHaveTextContent(
      'This was my grandmother\'s favorite recipe'
    )
  })

  it('shows file format information', () => {
    renderWithProvider()
    
    expect(screen.getByText('JPEG, PNG, WebP or GIF (max 10MB each)')).toBeInTheDocument()
  })

  it('resets file input after upload', async () => {
    renderWithProvider()
    
    const file = createMockFile('test-photo.jpg')
    const input = screen.getByLabelText('Click to upload photos') as HTMLInputElement
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('displays photos in a grid', async () => {
    renderWithProvider()
    
    const files = [
      createMockFile('photo1.jpg'),
      createMockFile('photo2.jpg'),
      createMockFile('photo3.jpg'),
    ]
    const input = screen.getByLabelText('Click to upload photos')
    
    fireEvent.change(input, { target: { files } })
    
    await waitFor(() => {
      const grid = screen.getByAltText('Photo 1').closest('.grid')
      expect(grid).toHaveClass('grid-cols-2', 'sm:grid-cols-3')
    })
  })

  it('shows hover effect on photo remove button', async () => {
    renderWithProvider()
    
    const file = createMockFile('test-photo.jpg')
    const input = screen.getByLabelText('Click to upload photos')
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      const removeButton = screen.getByLabelText('Remove photo')
      expect(removeButton).toHaveClass('opacity-0', 'group-hover:opacity-100')
    })
  })
})