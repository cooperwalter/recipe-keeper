import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RecipeScaler } from '../recipe-scaler'

describe('RecipeScaler', () => {
  const mockOnScaleChange = vi.fn()

  beforeEach(() => {
    mockOnScaleChange.mockClear()
  })

  it('should render with correct initial state', () => {
    render(<RecipeScaler originalServings={4} onScaleChange={mockOnScaleChange} />)
    
    expect(screen.getByText('Scale recipe:')).toBeInTheDocument()
    expect(screen.getByText('1x')).toBeInTheDocument()
    expect(screen.getByText('2x')).toBeInTheDocument()
    expect(screen.getByText('3x')).toBeInTheDocument()
    expect(screen.getByText('(4 servings)')).toBeInTheDocument()
  })

  it('should update servings when scale changes', async () => {
    const user = userEvent.setup()
    render(<RecipeScaler originalServings={4} onScaleChange={mockOnScaleChange} />)
    
    const button2x = screen.getByRole('radio', { name: 'Double recipe' })
    await user.click(button2x)
    
    expect(screen.getByText('(8 servings)')).toBeInTheDocument()
    expect(mockOnScaleChange).toHaveBeenCalledWith(2)
  })

  it('should handle 3x scaling', async () => {
    const user = userEvent.setup()
    render(<RecipeScaler originalServings={4} onScaleChange={mockOnScaleChange} />)
    
    const button3x = screen.getByRole('radio', { name: 'Triple recipe' })
    await user.click(button3x)
    
    expect(screen.getByText('(12 servings)')).toBeInTheDocument()
    expect(mockOnScaleChange).toHaveBeenCalledWith(3)
  })

  it('should round servings correctly', async () => {
    const user = userEvent.setup()
    render(<RecipeScaler originalServings={3} onScaleChange={mockOnScaleChange} />)
    
    const button2x = screen.getByRole('radio', { name: 'Double recipe' })
    await user.click(button2x)
    
    expect(screen.getByText('(6 servings)')).toBeInTheDocument()
  })

  it('should maintain selected state', async () => {
    const user = userEvent.setup()
    render(<RecipeScaler originalServings={4} onScaleChange={mockOnScaleChange} />)
    
    const button2x = screen.getByRole('radio', { name: 'Double recipe' })
    await user.click(button2x)
    
    expect(button2x).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('radio', { name: 'Original size' })).toHaveAttribute('data-state', 'off')
  })
})