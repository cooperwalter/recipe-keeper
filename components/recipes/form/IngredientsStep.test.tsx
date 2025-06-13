import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IngredientsStep } from './IngredientsStep'
import { RecipeFormProvider, useRecipeForm } from './RecipeFormContext'

// Test component to access form data
function TestComponent() {
  const { formData } = useRecipeForm()
  return (
    <div>
      <div data-testid="ingredients-count">{formData.ingredients.length}</div>
      {formData.ingredients.map((ing, i) => (
        <div key={i} data-testid={`ingredient-${i}`}>
          {ing.amount?.toString() || ''},{ing.unit || ''},{ing.ingredient},{ing.notes || ''}
        </div>
      ))}
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

describe('IngredientsStep', () => {
  const renderWithProvider = () => {
    return render(
      <TestWrapper>
        <IngredientsStep />
      </TestWrapper>
    )
  }

  it('renders empty state initially', () => {
    renderWithProvider()
    
    expect(screen.getByText('No ingredients added yet')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Ingredient')).toBeInTheDocument()
  })

  it('adds an ingredient', () => {
    renderWithProvider()
    
    fireEvent.click(screen.getByText('Add Your First Ingredient'))
    
    expect(screen.queryByText('No ingredients added yet')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Unit')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ingredient *')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Notes (optional)')).toBeInTheDocument()
  })

  it('updates ingredient fields', () => {
    renderWithProvider()
    
    // Add ingredient
    fireEvent.click(screen.getByText('Add Ingredient'))
    
    // Update fields
    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '2' } })
    fireEvent.change(screen.getByPlaceholderText('Unit'), { target: { value: 'cups' } })
    fireEvent.change(screen.getByPlaceholderText('Ingredient *'), { target: { value: 'flour' } })
    fireEvent.change(screen.getByPlaceholderText('Notes (optional)'), { target: { value: 'sifted' } })
    
    expect(screen.getByTestId('ingredient-0')).toHaveTextContent('2,cups,flour,sifted')
  })

  it('removes an ingredient', () => {
    renderWithProvider()
    
    // Add two ingredients
    fireEvent.click(screen.getByText('Add Ingredient'))
    fireEvent.click(screen.getByText('Add Ingredient'))
    
    expect(screen.getByTestId('ingredients-count')).toHaveTextContent('2')
    
    // Remove first ingredient
    const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
      btn => btn.querySelector('.lucide-x')
    )
    fireEvent.click(removeButtons[0])
    
    expect(screen.getByTestId('ingredients-count')).toHaveTextContent('1')
  })

  it('reorders ingredients with move up button', () => {
    renderWithProvider()
    
    // Add two ingredients
    fireEvent.click(screen.getByText('Add Ingredient'))
    fireEvent.click(screen.getByText('Add Ingredient'))
    
    // Set values
    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
    fireEvent.change(ingredientInputs[0], { target: { value: 'First' } })
    fireEvent.change(ingredientInputs[1], { target: { value: 'Second' } })
    
    // Move second ingredient up
    const moveButtons = screen.getAllByLabelText('Move up')
    fireEvent.click(moveButtons[1])
    
    // Check order changed
    expect(screen.getByTestId('ingredient-0')).toHaveTextContent('Second')
    expect(screen.getByTestId('ingredient-1')).toHaveTextContent('First')
  })

  it('disables move up button for first ingredient', () => {
    renderWithProvider()
    
    // Add ingredient
    fireEvent.click(screen.getByText('Add Ingredient'))
    
    const moveButton = screen.getByLabelText('Move up')
    expect(moveButton).toBeDisabled()
  })

  it('handles decimal amounts', () => {
    renderWithProvider()
    
    // Add ingredient
    fireEvent.click(screen.getByText('Add Ingredient'))
    
    // Set decimal amount
    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '0.5' } })
    
    expect(screen.getByTestId('ingredient-0')).toHaveTextContent('0.5,')
  })

  it('adds multiple ingredients from header button', () => {
    renderWithProvider()
    
    // Add first ingredient using header button
    const headerAddButton = screen.getAllByText('Add Ingredient')[0]
    fireEvent.click(headerAddButton)
    
    expect(screen.getByTestId('ingredients-count')).toHaveTextContent('1')
    
    // Add second ingredient
    fireEvent.click(headerAddButton)
    
    expect(screen.getByTestId('ingredients-count')).toHaveTextContent('2')
  })

  it('updates order indices when removing ingredients', () => {
    renderWithProvider()
    
    // Add three ingredients
    fireEvent.click(screen.getByText('Add Ingredient'))
    fireEvent.click(screen.getByText('Add Ingredient'))
    fireEvent.click(screen.getByText('Add Ingredient'))
    
    // Set values
    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
    fireEvent.change(ingredientInputs[0], { target: { value: 'First' } })
    fireEvent.change(ingredientInputs[1], { target: { value: 'Second' } })
    fireEvent.change(ingredientInputs[2], { target: { value: 'Third' } })
    
    // Remove middle ingredient
    const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
      btn => btn.querySelector('.lucide-x')
    )
    fireEvent.click(removeButtons[1])
    
    // Check remaining ingredients maintain order
    expect(screen.getByTestId('ingredient-0')).toHaveTextContent('First')
    expect(screen.getByTestId('ingredient-1')).toHaveTextContent('Third')
  })

  it('shows tip about reordering', () => {
    renderWithProvider()
    
    expect(screen.getByText('Tip: You can reorder ingredients by dragging them up or down')).toBeInTheDocument()
  })
})