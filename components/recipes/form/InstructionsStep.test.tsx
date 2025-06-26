import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InstructionsStep } from './InstructionsStep'
import { RecipeFormProvider, useRecipeForm } from './RecipeFormContext'

// Test component to access form data
function TestComponent() {
  const { formData } = useRecipeForm()
  return (
    <div>
      <div data-testid="instructions-count">{formData.instructions.length}</div>
      {formData.instructions.map((inst: { stepNumber: number; instruction: string }, i: number) => (
        <div key={i} data-testid={`instruction-${i}`}>
          Step {inst.stepNumber}: {inst.instruction}
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

describe('InstructionsStep', () => {
  const renderWithProvider = () => {
    return render(
      <TestWrapper>
        <InstructionsStep />
      </TestWrapper>
    )
  }

  it('renders empty state initially', () => {
    renderWithProvider()
    
    expect(screen.getByText('No instructions added yet')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Step')).toBeInTheDocument()
  })

  it('adds an instruction', () => {
    renderWithProvider()
    
    fireEvent.click(screen.getByText('Add Your First Step'))
    
    expect(screen.queryByText('No instructions added yet')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Describe this step')).toBeInTheDocument()
    expect(screen.getByTestId('instructions-count')).toHaveTextContent('1')
  })

  it('updates instruction text', () => {
    renderWithProvider()
    
    // Add instruction
    fireEvent.click(screen.getByText('Add Step'))
    
    // Update text
    const textarea = screen.getByPlaceholderText('Describe this step')
    fireEvent.change(textarea, { target: { value: 'Preheat oven to 350°F' } })
    
    expect(screen.getByTestId('instruction-0')).toHaveTextContent('Step 1: Preheat oven to 350°F')
  })

  it('adds multiple instructions', () => {
    renderWithProvider()
    
    // Add three instructions
    fireEvent.click(screen.getByText('Add Step'))
    fireEvent.click(screen.getByText('Add Step'))
    fireEvent.click(screen.getByText('Add Step'))
    
    expect(screen.getByTestId('instructions-count')).toHaveTextContent('3')
    // Check that all three step numbers exist
    const stepNumbers = screen.getAllByText(/^[1-3]$/).filter(el => 
      el.className.includes('rounded-full')
    )
    expect(stepNumbers).toHaveLength(3)
  })

  it('removes an instruction', () => {
    renderWithProvider()
    
    // Add two instructions
    fireEvent.click(screen.getByText('Add Step'))
    fireEvent.click(screen.getByText('Add Step'))
    
    expect(screen.getByTestId('instructions-count')).toHaveTextContent('2')
    
    // Remove first instruction
    const removeButtons = screen.getAllByLabelText('Remove instruction')
    fireEvent.click(removeButtons[0])
    
    expect(screen.getByTestId('instructions-count')).toHaveTextContent('1')
  })

  it('renumbers steps after removal', () => {
    renderWithProvider()
    
    // Add three instructions
    fireEvent.click(screen.getByText('Add Step'))
    fireEvent.click(screen.getByText('Add Step'))
    fireEvent.click(screen.getByText('Add Step'))
    
    // Set values
    const textareas = screen.getAllByPlaceholderText('Describe this step')
    fireEvent.change(textareas[0], { target: { value: 'First step' } })
    fireEvent.change(textareas[1], { target: { value: 'Second step' } })
    fireEvent.change(textareas[2], { target: { value: 'Third step' } })
    
    // Remove middle instruction
    const removeButtons = screen.getAllByLabelText('Remove instruction')
    fireEvent.click(removeButtons[1])
    
    // Check renumbering
    expect(screen.getByTestId('instruction-0')).toHaveTextContent('Step 1: First step')
    expect(screen.getByTestId('instruction-1')).toHaveTextContent('Step 2: Third step')
  })

  it('reorders instructions with move up button', () => {
    renderWithProvider()
    
    // Add two instructions
    fireEvent.click(screen.getByText('Add Step'))
    fireEvent.click(screen.getByText('Add Step'))
    
    // Set values
    const textareas = screen.getAllByPlaceholderText('Describe this step')
    fireEvent.change(textareas[0], { target: { value: 'First step' } })
    fireEvent.change(textareas[1], { target: { value: 'Second step' } })
    
    // Move second instruction up
    const moveButtons = screen.getAllByLabelText('Move up')
    fireEvent.click(moveButtons[1])
    
    // Check order changed
    expect(screen.getByTestId('instruction-0')).toHaveTextContent('Step 1: Second step')
    expect(screen.getByTestId('instruction-1')).toHaveTextContent('Step 2: First step')
  })

  it('disables move up button for first instruction', () => {
    renderWithProvider()
    
    // Add instruction
    fireEvent.click(screen.getByText('Add Step'))
    
    const moveButton = screen.getByLabelText('Move up')
    expect(moveButton).toBeDisabled()
  })

  it('handles multi-line instructions', () => {
    renderWithProvider()
    
    // Add instruction
    fireEvent.click(screen.getByText('Add Step'))
    
    // Set multi-line text
    const textarea = screen.getByPlaceholderText('Describe this step')
    fireEvent.change(textarea, { 
      target: { value: 'Mix dry ingredients:\n- Flour\n- Sugar\n- Salt' } 
    })
    
    // Check that the instruction contains the text (test content not DOM structure)
    const instruction = screen.getByTestId('instruction-0')
    expect(instruction.textContent).toContain('Mix dry ingredients:')
    expect(instruction.textContent).toContain('Flour')
    expect(instruction.textContent).toContain('Sugar')
    expect(instruction.textContent).toContain('Salt')
  })

  it('shows tip about breaking down complex recipes', () => {
    renderWithProvider()
    
    expect(screen.getByText('Tip: Break down complex recipes into clear, manageable steps'))
      .toBeInTheDocument()
  })

  it('prevents moving instructions out of bounds', () => {
    renderWithProvider()
    
    // Add single instruction
    fireEvent.click(screen.getByText('Add Step'))
    
    // Try to move up (should not crash)
    const moveButton = screen.getByLabelText('Move up')
    expect(moveButton).toBeDisabled()
  })
})