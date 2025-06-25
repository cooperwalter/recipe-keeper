import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUpload } from '@/components/recipe/image-upload';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDropzone } from 'react-dropzone';

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

describe('ImageUpload', () => {
  const mockOnUpload = vi.fn();
  const mockOnRemove = vi.fn();
  const mockGetRootProps = vi.fn(() => ({ role: 'button', 'data-testid': 'dropzone' }));
  const mockGetInputProps = vi.fn(() => ({ type: 'file' }));

  beforeEach(() => {
    vi.clearAllMocks();
    (useDropzone as any).mockReturnValue({
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: false,
      fileRejections: [],
    });
  });

  it('renders upload area with correct text', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    expect(screen.getByText('Upload your recipe image')).toBeInTheDocument();
    expect(screen.getByText('Drop a file here or use the buttons below')).toBeInTheDocument();
    expect(screen.getByText('Max 10MB • JPG, PNG, WebP')).toBeInTheDocument();
  });

  it('shows drag active state', () => {
    (useDropzone as any).mockReturnValue({
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: true,
      fileRejections: [],
    });

    render(<ImageUpload onUpload={mockOnUpload} />);
    
    expect(screen.getByText('Drop your recipe image here')).toBeInTheDocument();
  });

  it('shows uploading state', () => {
    render(<ImageUpload onUpload={mockOnUpload} isUploading />);
    
    expect(screen.getByText('Uploading')).toBeInTheDocument();
  });

  it('displays preview image', () => {
    const previewUrl = 'https://example.com/recipe.jpg';
    render(<ImageUpload onUpload={mockOnUpload} preview={previewUrl} />);
    
    const img = screen.getByAltText('Recipe preview');
    expect(img).toHaveAttribute('src', previewUrl);
  });

  it('renders remove button when preview is shown', () => {
    const previewUrl = 'https://example.com/recipe.jpg';
    render(
      <ImageUpload 
        onUpload={mockOnUpload} 
        onRemove={mockOnRemove}
        preview={previewUrl} 
      />
    );
    
    // Find the remove button specifically (has the X icon)
    const buttons = screen.getAllByRole('button');
    const removeButton = buttons.find(btn => btn.querySelector('svg.lucide-x'));
    
    expect(removeButton).toBeTruthy();
  });

  it('displays error message', () => {
    const errorMessage = 'File too large';
    render(<ImageUpload onUpload={mockOnUpload} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('handles file drop', async () => {
    const mockFile = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
    const mockOnDrop = vi.fn();

    (useDropzone as any).mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      mockOnDrop.mockImplementation(() => onDrop([mockFile]));
      return {
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
        fileRejections: [],
      };
    });

    render(<ImageUpload onUpload={mockOnUpload} />);
    
    // Simulate drop
    mockOnDrop();
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(mockFile);
    });
  });

  it('shows file rejection errors', () => {
    (useDropzone as any).mockReturnValue({
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: false,
      fileRejections: [{
        file: new File(['test'], 'recipe.txt', { type: 'text/plain' }),
        errors: [{ code: 'file-invalid-type', message: 'File type not accepted' }],
      }],
    });

    render(<ImageUpload onUpload={mockOnUpload} />);
    
    expect(screen.getByText('File type not accepted')).toBeInTheDocument();
  });

  it('disables dropzone when uploading', () => {
    const mockUseDropzone = vi.fn().mockReturnValue({
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: false,
      fileRejections: [],
    });
    (useDropzone as any).mockImplementation(mockUseDropzone);

    render(<ImageUpload onUpload={mockOnUpload} isUploading />);
    
    expect(mockUseDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );
  });

  it('applies correct CSS classes based on state', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    // Check that the dropzone wrapper exists with expected classes
    const container = screen.getByTestId('dropzone');
    expect(container).toHaveClass('relative', 'rounded-lg', 'border-2', 'border-dashed');
  });
});