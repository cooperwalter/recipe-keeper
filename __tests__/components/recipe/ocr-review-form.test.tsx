import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OCRReviewForm } from '@/components/recipe/ocr-review-form';
import { useRouter } from 'next/navigation';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('OCRReviewForm', () => {
  const mockPush = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const mockExtractedRecipe = {
    title: 'Chocolate Chip Cookies',
    description: 'Classic homemade cookies',
    prepTime: 15,
    cookTime: 12,
    servings: 24,
    ingredients: [
      {
        amount: '2',
        unit: 'cups',
        ingredient: 'all-purpose flour',
        orderIndex: 0,
      },
      {
        amount: '1',
        unit: 'tsp',
        ingredient: 'baking soda',
        orderIndex: 1,
      },
    ],
    instructions: [
      {
        stepNumber: 1,
        instruction: 'Preheat oven to 375°F',
      },
      {
        stepNumber: 2,
        instruction: 'Mix dry ingredients',
      },
    ],
    sourceName: 'Grandma Betty',
    sourceNotes: 'Best served warm',
    categories: ['dessert', 'cookies'],
    tags: ['family-recipe', 'holiday'],
    confidence: {
      overall: 0.9,
      fields: {
        title: 0.95,
        ingredients: 0.85,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders all form fields with extracted data', () => {
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Basic fields
    expect(screen.getByDisplayValue('Chocolate Chip Cookies')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Classic homemade cookies')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    expect(screen.getByDisplayValue('24')).toBeInTheDocument();

    // Ingredients
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('cups')).toBeInTheDocument();
    expect(screen.getByDisplayValue('all-purpose flour')).toBeInTheDocument();

    // Instructions
    expect(screen.getByDisplayValue('Preheat oven to 375°F')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mix dry ingredients')).toBeInTheDocument();

    // Source
    expect(screen.getByDisplayValue('Grandma Betty')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Best served warm')).toBeInTheDocument();

    // Categories and tags
    expect(screen.getByText('dessert')).toBeInTheDocument();
    expect(screen.getByText('cookies')).toBeInTheDocument();
    expect(screen.getByText('family-recipe')).toBeInTheDocument();
    expect(screen.getByText('holiday')).toBeInTheDocument();
  });

  it('shows confidence warning for low confidence', () => {
    const lowConfidenceRecipe = {
      ...mockExtractedRecipe,
      confidence: {
        overall: 0.5,
      },
    };

    render(
      <OCRReviewForm
        extractedRecipe={lowConfidenceRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/The OCR extraction confidence is/)).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    // Check the percentage is rendered
    const alertText = screen.getByText(/The OCR extraction confidence is/).parentElement;
    expect(alertText?.textContent).toContain('50%');
  });

  it('allows editing form fields', async () => {
    const user = userEvent.setup();
    
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const titleInput = screen.getByDisplayValue('Chocolate Chip Cookies');
    await user.clear(titleInput);
    await user.type(titleInput, 'Amazing Cookies');

    expect(titleInput).toHaveValue('Amazing Cookies');
  });

  it('adds new ingredient', async () => {
    const user = userEvent.setup();
    
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const addButton = screen.getByRole('button', { name: /add ingredient/i });
    await user.click(addButton);

    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *');
    expect(ingredientInputs).toHaveLength(3);
  });

  it('removes ingredient', async () => {
    const user = userEvent.setup();
    
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
      btn => btn.querySelector('svg')
    );
    
    await user.click(removeButtons[0]);

    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *');
    expect(ingredientInputs).toHaveLength(1);
  });

  it('adds new instruction', async () => {
    const user = userEvent.setup();
    
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const addButton = screen.getByRole('button', { name: /add instruction/i });
    await user.click(addButton);

    const instructionTextareas = screen.getAllByPlaceholderText('Instruction *');
    expect(instructionTextareas).toHaveLength(3);
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    const emptyRecipe = {
      ...mockExtractedRecipe,
      title: '',
      ingredients: [],
      instructions: [],
    };
    
    render(
      <OCRReviewForm
        extractedRecipe={emptyRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create recipe/i });
    await user.click(submitButton);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValueOnce(undefined);
    
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create recipe/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Chocolate Chip Cookies',
        ingredients: expect.arrayContaining([
          expect.objectContaining({
            ingredient: 'all-purpose flour',
          }),
        ]),
      }));
    });
  });

  it('shows error message on submit failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to save recipe';
    mockOnSubmit.mockRejectedValueOnce(new Error(errorMessage));
    
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create recipe/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons while submitting', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(
      <OCRReviewForm
        extractedRecipe={mockExtractedRecipe}
        imageUrl="test.jpg"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create recipe/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});