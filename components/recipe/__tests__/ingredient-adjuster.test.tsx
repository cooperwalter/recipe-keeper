import { render, screen } from '@testing-library/react'
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
    unit: 'tsp',
    scale: 1,
    onAdjustment: vi.fn()
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
  })

  it('should display current amount in input', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const input = screen.getByRole('textbox', { name: /custom amount/i })
    expect(input).toHaveValue('1')
  })

  it('should increment amount when plus button clicked and popover closed', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const plusButton = screen.getByRole('button', { name: /increase amount/i })
    await user.click(plusButton)
    
    // Close the popover by clicking outside
    await user.click(document.body)
    
    // 1 >= 1, so increment is 0.25, rounded to nearest 1/8
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(1.25)
  })

  it('should decrement amount when minus button clicked and popover closed', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const minusButton = screen.getByRole('button', { name: /decrease amount/i })
    await user.click(minusButton)
    
    // Close the popover by clicking outside
    await user.click(document.body)
    
    // 1 <= 1, so decrement is 0.125, rounded to nearest 1/8
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(0.875)
  })

  it('should use smaller increments for amounts less than 1', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} originalAmount={0.5} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const plusButton = screen.getByRole('button', { name: /increase amount/i })
    await user.click(plusButton)
    
    // Close the popover by clicking outside
    await user.click(document.body)
    
    // 0.5 < 1, so increment is 0.125
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(0.625)
  })

  it('should not go below 0.125 when decrementing', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} originalAmount={0.25} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const minusButton = screen.getByRole('button', { name: /decrease amount/i })
    await user.click(minusButton)
    
    // Close the popover by clicking outside
    await user.click(document.body)
    
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
    
    // Close the popover by clicking outside
    await user.click(document.body)
    
    expect(defaultProps.onAdjustment).toHaveBeenCalledWith(2.5)
  })


  it('should display unit next to input', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    expect(screen.getByText('tsp')).toBeInTheDocument()
  })

  it('should handle ingredients without units', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} unit={undefined} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    // Should not show unit text when unit is undefined
    const unitText = screen.queryByText('undefined')
    expect(unitText).not.toBeInTheDocument()
  })

  it('should not call onAdjustment if popover closed without changes', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    // Close the popover without making any changes
    await user.click(document.body)
    
    expect(defaultProps.onAdjustment).not.toHaveBeenCalled()
  })

  it('should update local state immediately when adjusting', async () => {
    const user = userEvent.setup()
    render(<IngredientAdjuster {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: /adjust amount for black pepper/i })
    await user.click(button)
    
    const plusButton = screen.getByRole('button', { name: /increase amount/i })
    await user.click(plusButton)
    
    // Check that the input shows the new value immediately (formatAmount returns '1 ¼' with unicode fraction)
    const input = screen.getByRole('textbox', { name: /custom amount/i })
    expect(input).toHaveValue('1 ¼')
  })
})