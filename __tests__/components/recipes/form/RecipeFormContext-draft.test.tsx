import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { RecipeFormProvider, useRecipeForm } from '@/components/recipes/form/RecipeFormContext'
import { draftPersistence } from '@/lib/utils/draft-persistence'

// Mock draft persistence
vi.mock('@/lib/utils/draft-persistence', () => ({
  draftPersistence: {
    save: vi.fn(),
    load: vi.fn(),
    clear: vi.fn(),
    getTimestamp: vi.fn(),
    exists: vi.fn()
  }
}))

// Test component to access context
function TestComponent() {
  const context = useRecipeForm()
  return (
    <div>
      <div data-testid="title">{context.formData.title}</div>
      <div data-testid="draft-saved-at">{context.draftSavedAt?.toISOString() || 'no-draft'}</div>
      <button onClick={() => context.updateFormData({ title: 'Updated Title' })}>
        Update Title
      </button>
      <button onClick={() => context.clearDraft()}>
        Clear Draft
      </button>
    </div>
  )
}

describe('RecipeFormContext Draft Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should load draft on mount when no initial data provided', async () => {
    const mockDraft = {
      title: 'Draft Recipe',
      description: 'From draft',
      ingredients: [],
      instructions: [],
      categoryIds: [],
      tags: [],
      photos: [],
      prepTime: undefined,
      cookTime: undefined,
      servings: undefined,
      isPublic: false,
      sourceName: '',
      sourceNotes: ''
    }
    const mockTimestamp = new Date('2024-01-01T10:00:00')

    vi.mocked(draftPersistence.load).mockReturnValue(mockDraft)
    vi.mocked(draftPersistence.getTimestamp).mockReturnValue(mockTimestamp)

    let getByTestId: any
    
    act(() => {
      const result = render(
        <RecipeFormProvider>
          <TestComponent />
        </RecipeFormProvider>
      )
      getByTestId = result.getByTestId
    })

    // Allow useEffect to run
    await act(async () => {
      await Promise.resolve()
    })

    expect(getByTestId('title')).toHaveTextContent('Draft Recipe')
    expect(getByTestId('draft-saved-at')).toHaveTextContent(mockTimestamp.toISOString())
  })

  it('should not load draft when initial data is provided', async () => {
    const mockDraft = {
      title: 'Draft Recipe',
      description: 'From draft',
      ingredients: [],
      instructions: [],
      categoryIds: [],
      tags: [],
      photos: []
    }

    vi.mocked(draftPersistence.load).mockReturnValue(mockDraft)

    const { getByTestId } = render(
      <RecipeFormProvider initialData={{ title: 'Initial Recipe' }}>
        <TestComponent />
      </RecipeFormProvider>
    )

    expect(getByTestId('title')).toHaveTextContent('Initial Recipe')
    expect(draftPersistence.load).not.toHaveBeenCalled()
  })

  it('should save draft when form data changes', async () => {
    let getByText: any
    
    act(() => {
      const result = render(
        <RecipeFormProvider>
          <TestComponent />
        </RecipeFormProvider>
      )
      getByText = result.getByText
    })

    // Allow initial render
    await act(async () => {
      await Promise.resolve()
    })

    // Update form data
    act(() => {
      getByText('Update Title').click()
    })

    // Wait for debounce (1 second)
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(draftPersistence.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Title'
      })
    )
  })

  it('should clear draft when clearDraft is called', () => {
    const { getByText, getByTestId } = render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )

    // Clear draft
    act(() => {
      getByText('Clear Draft').click()
    })

    expect(draftPersistence.clear).toHaveBeenCalled()
    expect(getByTestId('draft-saved-at')).toHaveTextContent('no-draft')
  })
})