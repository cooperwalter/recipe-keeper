import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceChangeReview } from './voice-change-review'

const mockChanges = [
  {
    type: 'modify' as const,
    field: 'cookTime' as const,
    oldValue: '20',
    newValue: '25',
    details: 'User wants to increase cooking time'
  },
  {
    type: 'add' as const,
    field: 'ingredients' as const,
    newValue: { ingredient: 'vanilla extract', amount: '1', unit: 'tsp' },
    details: 'Adding vanilla extract to the recipe'
  },
  {
    type: 'remove' as const,
    field: 'ingredients' as const,
    oldValue: { ingredient: 'salt', amount: '1', unit: 'tsp' },
    details: 'Removing salt from the recipe'
  },
  {
    type: 'modify' as const,
    field: 'instructions' as const,
    oldValue: { stepNumber: 3, instruction: 'Bake for 20 minutes' },
    newValue: { stepNumber: 3, instruction: 'Bake for 25 minutes until golden brown' },
    details: 'Updating baking instruction'
  }
]

describe('VoiceChangeReview', () => {
  const mockOnApprove = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all changes correctly', () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    expect(screen.getByText('Review Recipe Changes')).toBeInTheDocument()
    expect(screen.getByText('Cook Time')).toBeInTheDocument()
    expect(screen.getAllByText('Ingredients')).toHaveLength(2) // Two ingredient changes
    expect(screen.getByText('Instructions')).toBeInTheDocument()
  })

  it('displays change types with correct badges', () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    expect(screen.getAllByText('modify')).toHaveLength(2)
    expect(screen.getByText('add')).toBeInTheDocument()
    expect(screen.getByText('remove')).toBeInTheDocument()
  })

  it('shows old and new values for modify changes', () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    // There are multiple "From:" and "To:" texts due to multiple modify changes
    expect(screen.getAllByText('From:')).toHaveLength(2)
    expect(screen.getByText('20 minutes')).toBeInTheDocument() // Component formats cookTime with "minutes"
    expect(screen.getAllByText('To:')).toHaveLength(2)
    expect(screen.getByText('25 minutes')).toBeInTheDocument()
  })

  it('allows removing a change', async () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    const removeButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')?.classList.contains('text-destructive')
    )
    
    expect(removeButtons).toHaveLength(4)
    
    await userEvent.click(removeButtons[0])
    
    // Cook Time should be removed
    expect(screen.queryByText('Cook Time')).not.toBeInTheDocument()
  })

  it('enters edit mode when edit button is clicked', async () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    const editButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg[class*="h-4 w-4"]') && !btn.querySelector('svg[class*="text-destructive"]')
    )
    
    await userEvent.click(editButtons[0])
    
    // Should show input field for editing
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue(25)
  })

  it('saves edited value', async () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    // Click edit on cook time
    const editButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg[class*="h-4 w-4"]') && !btn.querySelector('svg[class*="text-destructive"]')
    )
    await userEvent.click(editButtons[0])
    
    // Change value
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '30')
    
    // Save - find button with check icon
    const buttons = screen.getAllByRole('button')
    const saveButton = buttons.find(btn => btn.querySelector('svg.lucide-check'))
    expect(saveButton).toBeDefined()
    await userEvent.click(saveButton!)
    
    // Should show new value
    expect(screen.getByText('30 minutes')).toBeInTheDocument()
  })

  it('shows empty state when no changes', () => {
    render(
      <VoiceChangeReview 
        changes={[]} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    expect(screen.getByText(/No changes detected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /apply changes/i })).toBeDisabled()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('shows confirmation dialog when apply is clicked', async () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    const applyButton = screen.getByRole('button', { name: /apply changes/i })
    await userEvent.click(applyButton)
    
    expect(screen.getByText('Apply Recipe Changes?')).toBeInTheDocument()
    expect(screen.getByText(/You are about to apply 4 changes/i)).toBeInTheDocument()
  })

  it('calls onApprove with changes when confirmed', async () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    const applyButton = screen.getByRole('button', { name: /apply changes/i })
    await userEvent.click(applyButton)
    
    const confirmButton = screen.getByRole('button', { name: /apply changes/i, exact: false })
    await userEvent.click(confirmButton)
    
    expect(mockOnApprove).toHaveBeenCalledWith(mockChanges)
  })

  it('cancels confirmation dialog', async () => {
    const user = userEvent.setup()
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    const applyButton = screen.getByRole('button', { name: /apply changes/i })
    await user.click(applyButton)
    
    // Wait for the dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Apply Recipe Changes?')).toBeInTheDocument()
    })
    
    // Find the cancel button in the dialog
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
    const dialogCancelButton = cancelButtons[cancelButtons.length - 1] // Last cancel button is in dialog
    await user.click(dialogCancelButton)
    
    expect(mockOnApprove).not.toHaveBeenCalled()
  })

  it('displays ingredient changes correctly', () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    // Add ingredient
    expect(screen.getByText('Add:')).toBeInTheDocument()
    expect(screen.getByText('1 tsp vanilla extract')).toBeInTheDocument()
    
    // Remove ingredient - now shows the value in the updated component
    expect(screen.getByText('Remove:')).toBeInTheDocument()
    expect(screen.getByText('1 tsp salt')).toBeInTheDocument()
  })

  it('displays instruction changes correctly', () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    expect(screen.getByText('Step 3: Bake for 25 minutes until golden brown')).toBeInTheDocument()
  })

  it('disables buttons when applying', () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
        isApplying={true}
      />
    )

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    expect(screen.getByText('Applying Changes...')).toBeInTheDocument()
  })

  it('handles tags array correctly', () => {
    const changeWithTags = [{
      type: 'modify' as const,
      field: 'tags' as const,
      oldValue: ['dessert', 'sweet'],
      newValue: ['dessert', 'sweet', 'chocolate'],
      details: 'Adding chocolate tag'
    }]
    
    render(
      <VoiceChangeReview 
        changes={changeWithTags} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    expect(screen.getByText('dessert, sweet, chocolate')).toBeInTheDocument()
  })

  it('displays change details when provided', () => {
    render(
      <VoiceChangeReview 
        changes={mockChanges} 
        onApprove={mockOnApprove} 
        onCancel={mockOnCancel} 
      />
    )

    expect(screen.getByText('User wants to increase cooking time')).toBeInTheDocument()
    expect(screen.getByText('Adding vanilla extract to the recipe')).toBeInTheDocument()
  })
})