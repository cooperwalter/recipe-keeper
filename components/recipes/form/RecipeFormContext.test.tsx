import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecipeFormProvider, useRecipeForm } from './RecipeFormContext'

// Test component that uses the context
function TestComponent() {
  const { formData, updateFormData, currentStep, nextStep, previousStep, isValid } = useRecipeForm()
  
  return (
    <div>
      <div data-testid="current-step">{currentStep}</div>
      <div data-testid="title">{formData.title}</div>
      <div data-testid="ingredients-count">{formData.ingredients.length}</div>
      <div data-testid="instructions-count">{formData.instructions.length}</div>
      <div data-testid="is-valid">{isValid(currentStep) ? 'valid' : 'invalid'}</div>
      
      <button onClick={() => updateFormData({ title: 'Updated Title' })}>
        Update Title
      </button>
      <button onClick={nextStep}>Next Step</button>
      <button onClick={previousStep}>Previous Step</button>
      <button onClick={() => updateFormData({ 
        ingredients: [{ ingredient: 'Test', orderIndex: 0 }] 
      })}>
        Add Ingredient
      </button>
      <button onClick={() => updateFormData({ 
        instructions: [{ stepNumber: 1, instruction: 'Test' }] 
      })}>
        Add Instruction
      </button>
    </div>
  )
}

describe('RecipeFormContext', () => {
  it('provides initial form data', () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    expect(screen.getByTestId('current-step')).toHaveTextContent('0')
    expect(screen.getByTestId('title')).toHaveTextContent('')
    expect(screen.getByTestId('ingredients-count')).toHaveTextContent('0')
    expect(screen.getByTestId('instructions-count')).toHaveTextContent('0')
  })

  it('updates form data', () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    fireEvent.click(screen.getByText('Update Title'))
    expect(screen.getByTestId('title')).toHaveTextContent('Updated Title')
  })

  it('navigates between steps', async () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    expect(screen.getByTestId('current-step')).toHaveTextContent('0')
    
    // First add title to make step valid
    fireEvent.click(screen.getByText('Update Title'))
    
    fireEvent.click(screen.getByText('Next Step'))
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('1')
    })
    
    fireEvent.click(screen.getByText('Previous Step'))
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('0')
    })
  })

  it('prevents going before first step', () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    fireEvent.click(screen.getByText('Previous Step'))
    expect(screen.getByTestId('current-step')).toHaveTextContent('0')
  })

  it('prevents going past last step', async () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    // Make each step valid before proceeding
    // Step 0 - add title
    fireEvent.click(screen.getByText('Update Title'))
    
    // Go to step 1
    fireEvent.click(screen.getByText('Next Step'))
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('1')
    })
    
    // Add ingredient to make step 1 valid
    fireEvent.click(screen.getByText('Add Ingredient'))
    
    // Go to step 2
    fireEvent.click(screen.getByText('Next Step'))
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('2')
    })
    
    // Add instruction to make step 2 valid
    fireEvent.click(screen.getByText('Add Instruction'))
    
    // Go to step 3
    fireEvent.click(screen.getByText('Next Step'))
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('3')
    })
    
    // Try to go further
    fireEvent.click(screen.getByText('Next Step'))
    expect(screen.getByTestId('current-step')).toHaveTextContent('3')
  })

  it('validates step 0 (basic info) correctly', () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    // Initially invalid (no title)
    expect(screen.getByTestId('is-valid')).toHaveTextContent('invalid')
    
    // Add title
    fireEvent.click(screen.getByText('Update Title'))
    expect(screen.getByTestId('is-valid')).toHaveTextContent('valid')
  })

  it('validates step 1 (ingredients) correctly', () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    // Go to step 1
    fireEvent.click(screen.getByText('Next Step'))
    
    // Initially invalid (no ingredients)
    expect(screen.getByTestId('is-valid')).toHaveTextContent('invalid')
    
    // Add ingredient
    fireEvent.click(screen.getByText('Add Ingredient'))
    expect(screen.getByTestId('is-valid')).toHaveTextContent('valid')
  })

  it('validates step 2 (instructions) correctly', () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    // Go to step 2
    fireEvent.click(screen.getByText('Next Step'))
    fireEvent.click(screen.getByText('Next Step'))
    
    // Initially invalid (no instructions)
    expect(screen.getByTestId('is-valid')).toHaveTextContent('invalid')
    
    // Add instruction
    fireEvent.click(screen.getByText('Add Instruction'))
    expect(screen.getByTestId('is-valid')).toHaveTextContent('valid')
  })

  it('step 3 (photos/notes) is always valid', () => {
    render(
      <RecipeFormProvider>
        <TestComponent />
      </RecipeFormProvider>
    )
    
    // Go to step 3
    fireEvent.click(screen.getByText('Next Step'))
    fireEvent.click(screen.getByText('Next Step'))
    fireEvent.click(screen.getByText('Next Step'))
    
    // Should be valid (no required fields)
    expect(screen.getByTestId('is-valid')).toHaveTextContent('valid')
  })

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = () => {}
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useRecipeForm must be used within RecipeFormProvider')
    
    console.error = originalError
  })
})