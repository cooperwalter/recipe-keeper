import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OCRRecipeFlow } from '@/components/recipe/ocr-recipe-flow';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock components
vi.mock('@/components/recipe/image-upload', () => ({
  ImageUpload: ({ onUpload, error }: any) => (
    <div>
      <button onClick={() => onUpload(new File(['test'], 'test.jpg', { type: 'image/jpeg' }))}>
        Upload Image
      </button>
      {error && <div>{error}</div>}
    </div>
  ),
}));

vi.mock('@/components/recipe/ocr-review-form', () => ({
  OCRReviewForm: ({ extractedRecipe, onSubmit, onCancel }: any) => (
    <div>
      <h2>Review Form</h2>
      <div>{extractedRecipe.title}</div>
      <button onClick={() => onSubmit(extractedRecipe)}>Submit Recipe</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('OCRRecipeFlow Integration', () => {
  const mockPush = vi.fn();
  const mockStorageRemove = vi.fn();
  let mockSupabase: any;
  let mockStorageBucket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });

    mockStorageBucket = {
      remove: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
    };
    mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue(mockStorageBucket),
      },
    };
    (createClient as any).mockReturnValue(mockSupabase);
    mockStorageRemove.mockImplementation(() => mockStorageBucket.remove());
  });

  it('completes full OCR flow successfully', async () => {
    const user = userEvent.setup();

    // Mock successful upload response
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/recipe.jpg',
          extractedText: 'Recipe text',
          fileName: 'user123/recipe.jpg',
        }),
      })
      // Mock successful extraction response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recipe: {
            title: 'Chocolate Chip Cookies',
            ingredients: [
              { ingredient: 'flour', orderIndex: 0 },
            ],
            instructions: [
              { stepNumber: 1, instruction: 'Mix ingredients' },
            ],
            confidence: { overall: 0.9 },
          },
        }),
      })
      // Mock successful recipe creation
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'recipe123',
        }),
      });

    render(<OCRRecipeFlow />);

    // Initial state - upload step
    expect(screen.getByText('Upload Recipe Image')).toBeInTheDocument();
    expect(screen.getByText('Upload a photo of your recipe card or handwritten recipe')).toBeInTheDocument();

    // Upload image
    const uploadButton = screen.getByText('Upload Image');
    await user.click(uploadButton);

    // Should show processing state
    await waitFor(() => {
      expect(screen.getByText('Processing Image')).toBeInTheDocument();
    });

    // Should move to review step
    await waitFor(() => {
      expect(screen.getByText('Review & Edit Recipe')).toBeInTheDocument();
      expect(screen.getByText('Review Form')).toBeInTheDocument();
      expect(screen.getByText('Chocolate Chip Cookies')).toBeInTheDocument();
    });

    // Submit recipe
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    // Should show creating state
    await waitFor(() => {
      expect(screen.getByText('Creating Recipe')).toBeInTheDocument();
    });

    // Should redirect to recipe page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/protected/recipes/recipe123');
    });

    // Should clean up OCR upload
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('ocr-uploads');
    expect(mockSupabase.storage.from('ocr-uploads').remove).toHaveBeenCalledWith(['recipe.jpg']);
  });

  it('handles upload error gracefully', async () => {
    const user = userEvent.setup();

    // Mock failed upload response
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Upload failed',
      }),
    });

    render(<OCRRecipeFlow />);

    const uploadButton = screen.getByText('Upload Image');
    await user.click(uploadButton);

    // Should show error and stay on upload step
    await waitFor(() => {
      const errorElements = screen.getAllByText('Upload failed');
      expect(errorElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Upload Recipe Image')).toBeInTheDocument();
    });
  });

  it('handles extraction error gracefully', async () => {
    const user = userEvent.setup();

    // Mock successful upload but failed extraction
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/recipe.jpg',
          extractedText: 'Recipe text',
          fileName: 'user123/recipe.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Extraction failed',
        }),
      });

    render(<OCRRecipeFlow />);

    const uploadButton = screen.getByText('Upload Image');
    await user.click(uploadButton);

    // Should show error and return to upload step
    await waitFor(() => {
      const errorElements = screen.getAllByText('Extraction failed');
      expect(errorElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Upload Recipe Image')).toBeInTheDocument();
    });
  });

  it('handles recipe creation error', async () => {
    const user = userEvent.setup();

    // Mock successful upload and extraction but failed creation
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/recipe.jpg',
          extractedText: 'Recipe text',
          fileName: 'user123/recipe.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recipe: {
            title: 'Test Recipe',
            ingredients: [],
            instructions: [],
            confidence: { overall: 0.8 },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Creation failed',
        }),
      });

    render(<OCRRecipeFlow />);

    const uploadButton = screen.getByText('Upload Image');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Review Form')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    // Should show error and return to review step
    await waitFor(() => {
      expect(screen.getByText('Creation failed')).toBeInTheDocument();
      expect(screen.getByText('Review & Edit Recipe')).toBeInTheDocument();
    });
  });

  it('handles cancel action properly', async () => {
    const user = userEvent.setup();

    // Mock successful upload and extraction
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/recipe.jpg',
          extractedText: 'Recipe text',
          fileName: 'user123/recipe.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recipe: {
            title: 'Test Recipe',
            ingredients: [],
            instructions: [],
            confidence: { overall: 0.8 },
          },
        }),
      });

    render(<OCRRecipeFlow />);

    const uploadButton = screen.getByText('Upload Image');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Review Form')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    // Should clean up and redirect
    await waitFor(() => {
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('ocr-uploads');
      expect(mockSupabase.storage.from('ocr-uploads').remove).toHaveBeenCalledWith(['recipe.jpg']);
      expect(mockPush).toHaveBeenCalledWith('/protected/recipes');
    });
  });

  it('shows progress bar during processing', async () => {
    // Mock slow upload
    (fetch as any).mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              imageUrl: 'https://example.com/recipe.jpg',
              extractedText: 'Recipe text',
              fileName: 'user123/recipe.jpg',
            }),
          });
        }, 100);
      })
    );

    render(<OCRRecipeFlow />);

    const uploadButton = screen.getByText('Upload Image');
    fireEvent.click(uploadButton);

    // Should show progress bar
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('displays original image during review', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/recipe.jpg',
          extractedText: 'Recipe text',
          fileName: 'user123/recipe.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recipe: {
            title: 'Test Recipe',
            ingredients: [],
            instructions: [],
            confidence: { overall: 0.8 },
          },
        }),
      });

    render(<OCRRecipeFlow />);

    const uploadButton = screen.getByText('Upload Image');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Original Recipe')).toBeInTheDocument();
      expect(screen.getByAltText('Original recipe')).toBeInTheDocument();
    });
  });
});