import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { IngredientAdjuster } from '../ingredient-adjuster'

// Mock the Tooltip component to avoid issues with Radix UI in tests
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
}))

describe('IngredientAdjuster', () => {
  const defaultProps = {
    ingredientId: '1',
    ingredientName: 'black pepper',
    originalAmount: 1,
    scaledAmount: 1.5,
    unit: 'tsp',
    onAdjustment: vi.fn(),
    adjustmentReason: 'Spices intensify with larger batches',
    hasCustomAdjustment: false
  }

  beforeEach(() => {
    defaultProps.onAdjustment.mockClear()
  })

  it('should render the adjustment button', () => {
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    expect(button).toBeInTheDocument()
  })

  it('should show popover when clicked', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    expect(screen.getByText('Adjust black pepper')).toBeInTheDocument()
    expect(screen.getByText(defaultProps.adjustmentReason)).toBeInTheDocument()
  })

  it('should display current scaled amount in input', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const input = screen.getByRole('textbox', { name: /custom amount/i })
    expect(input).toHaveValue('1 ½')
  })

  it('should increment amount when plus button clicked', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const plusButton = screen.getByRole('button', { name: /increase amount/i })
    await user.click(plusButton)
    
    // 1.5 >= 1, so increment is 0.25, rounded to nearest 1/8
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(1.75)
  })

  it('should decrement amount when minus button clicked', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const minusButton = screen.getByRole('button', { name: /decrease amount/i })
    await user.click(minusButton)
    
    // 1.5 > 1, so decrement is 0.25, rounded to nearest 1/8
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(1.25)
  })

  it('should use smaller increments for amounts less than 1', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} scaledAmount={0.5} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const plusButton = screen.getByRole('button', { name: /increase amount/i })
    await user.click(plusButton)
    
    // 0.5 < 1, so increment is 0.125
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(0.625)
  })

  it('should not go below 0.125 when decrementing', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} scaledAmount={0.25} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const minusButton = screen.getByRole('button', { name: /decrease amount/i })
    await user.click(minusButton)
    
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(0.125)
  })

  it('should handle custom input values', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const input = screen.getByRole('textbox', { name: /custom amount/i })
    await user.clear(input)
    await user.type(input, '2.5')
    
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(2.5)
  })

  it('should show reset button when has custom adjustment', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} hasCustomAdjustment={true} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const resetButton = screen.getByText('Reset')
    expect(resetButton).toBeInTheDocument()
  })

  it('should reset to scaled amount when reset clicked', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} hasCustomAdjustment={true} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const resetButton = screen.getByText('Reset')
    await user.click(resetButton)
    
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(undefined)
  })

  it('should display unit next to input', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    expect(screen.getByText('tsp')).toBeInTheDocument()
  })

  it('should show original amount in popover', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    expect(screen.getByText('Base Amount: 1 tsp')).toBeInTheDocument()
  })

  it('should highlight button when ingredient is adjusted', () => {
    render(<IngredientAdjuster {...defaultProps} hasCustomAdjustment={true} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    expect(button).toHaveClass('text-primary')
  })

  it('should handle ingredients without units', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} unit={undefined} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    expect(screen.getByText('Base Amount: 1')).toBeInTheDocument()
  })

  it('should close popover when reset is clicked', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} hasCustomAdjustment={true} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const resetButton = screen.getByText('Reset')
    await user.click(resetButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Adjust black pepper')).not.toBeInTheDocument()
    })
  })
})