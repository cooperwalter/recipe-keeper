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
    // Due to responsive layout, we have multiple inputs with same placeholder
    expect(screen.getAllByPlaceholderText('Amount').length).toBeGreaterThan(0)
    expect(screen.getAllByPlaceholderText('Unit').length).toBeGreaterThan(0)
    expect(screen.getAllByPlaceholderText('Ingredient *').length).toBeGreaterThan(0)
    // Notes field exists only on desktop
    const notesInputs = screen.queryAllByPlaceholderText('Notes (optional)')
    expect(notesInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('updates ingredient fields', () => {
    renderWithProvider()
    
    // Add ingredient
    fireEvent.click(screen.getByText('Add Ingredient'))
    
    // Update fields - get all inputs and use the visible ones
    const amountInputs = screen.getAllByPlaceholderText('Amount')
    const unitInputs = screen.getAllByPlaceholderText('Unit')
    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
    const notesInputs = screen.queryAllByPlaceholderText('Notes (optional)')
    
    fireEvent.change(amountInputs[0], { target: { value: '2' } })
    fireEvent.change(unitInputs[0], { target: { value: 'cups' } })
    fireEvent.change(ingredientInputs[0], { target: { value: 'flour' } })
    if (notesInputs.length > 0) {
      fireEvent.change(notesInputs[0], { target: { value: 'sifted' } })
    }
    
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
    
    // Set values - handle duplicate inputs from responsive layout
    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
    // We have duplicate inputs (mobile + desktop), so we need to update the correct ones
    // Each ingredient has 2 inputs, so second ingredient starts at index 2
    fireEvent.change(ingredientInputs[0], { target: { value: 'First' } })
    fireEvent.change(ingredientInputs[2], { target: { value: 'Second' } })
    
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
    
    // Set decimal amount - use first available input
    const amountInputs = screen.getAllByPlaceholderText('Amount')
    fireEvent.change(amountInputs[0], { target: { value: '0.5' } })
    
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
    
    // Set values - handle duplicate inputs from responsive layout
    const ingredientInputs = screen.getAllByPlaceholderText('Ingredient *')
    // Each ingredient has 2 inputs (mobile + desktop)
    fireEvent.change(ingredientInputs[0], { target: { value: 'First' } })
    fireEvent.change(ingredientInputs[2], { target: { value: 'Second' } })
    fireEvent.change(ingredientInputs[4], { target: { value: 'Third' } })
    
    // Remove middle ingredient
    // We have multiple remove buttons due to responsive layout (2 per ingredient)
    const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
      btn => btn.querySelector('.lucide-x')
    )
    // Second ingredient's remove button would be at index 2 or 3
    fireEvent.click(removeButtons[2])
    
    // Check remaining ingredients maintain order
    expect(screen.getByTestId('ingredient-0')).toHaveTextContent('First')
    expect(screen.getByTestId('ingredient-1')).toHaveTextContent('Third')
  })

  it('shows tip about reordering', () => {
    renderWithProvider()
    
    expect(screen.getByText('Tip: You can reorder ingredients by dragging them up or down')).toBeInTheDocument()
  })
})