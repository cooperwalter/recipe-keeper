import { RecipeWithRelations, Ingredient, Instruction } from '@/lib/types/recipe'

/**
 * Common test assertions for recipe-related data
 */

export function expectRecipeToMatch(
  actual: Partial<RecipeWithRelations>,
  expected: Partial<RecipeWithRelations>
) {
  // Compare basic properties
  if (expected.title !== undefined) expect(actual.title).toBe(expected.title)
  if (expected.description !== undefined) expect(actual.description).toBe(expected.description)
  if (expected.prepTime !== undefined) expect(actual.prepTime).toBe(expected.prepTime)
  if (expected.cookTime !== undefined) expect(actual.cookTime).toBe(expected.cookTime)
  if (expected.servings !== undefined) expect(actual.servings).toBe(expected.servings)
  if (expected.isPublic !== undefined) expect(actual.isPublic).toBe(expected.isPublic)
  if (expected.sourceName !== undefined) expect(actual.sourceName).toBe(expected.sourceName)
  if (expected.sourceNotes !== undefined) expect(actual.sourceNotes).toBe(expected.sourceNotes)
  
  // Compare arrays if provided
  if (expected.ingredients) {
    expectIngredientsToMatch(actual.ingredients || [], expected.ingredients)
  }
  
  if (expected.instructions) {
    expectInstructionsToMatch(actual.instructions || [], expected.instructions)
  }
  
  if (expected.tags) {
    expect(actual.tags).toEqual(expect.arrayContaining(expected.tags))
  }
  
  if (expected.badges) {
    expect(actual.badges).toEqual(expect.arrayContaining(expected.badges))
  }
}

export function expectIngredientsToMatch(
  actual: Ingredient[],
  expected: Partial<Ingredient>[]
) {
  expect(actual).toHaveLength(expected.length)
  
  actual.forEach((ingredient, index) => {
    const expectedIngredient = expected[index]
    if (expectedIngredient.ingredient !== undefined) {
      expect(ingredient.ingredient).toBe(expectedIngredient.ingredient)
    }
    if (expectedIngredient.amount !== undefined) {
      expect(ingredient.amount).toBe(expectedIngredient.amount)
    }
    if (expectedIngredient.unit !== undefined) {
      expect(ingredient.unit).toBe(expectedIngredient.unit)
    }
    if (expectedIngredient.notes !== undefined) {
      expect(ingredient.notes).toBe(expectedIngredient.notes)
    }
    if (expectedIngredient.optional !== undefined) {
      expect(ingredient.optional).toBe(expectedIngredient.optional)
    }
  })
}

export function expectInstructionsToMatch(
  actual: Instruction[],
  expected: Partial<Instruction>[]
) {
  expect(actual).toHaveLength(expected.length)
  
  actual.forEach((instruction, index) => {
    const expectedInstruction = expected[index]
    if (expectedInstruction.instruction !== undefined) {
      expect(instruction.instruction).toBe(expectedInstruction.instruction)
    }
    if (expectedInstruction.step !== undefined) {
      expect(instruction.step).toBe(expectedInstruction.step)
    }
  })
}

export function expectRecipeFormDataToBeValid(formData: {
  title?: unknown
  ingredients?: unknown
  instructions?: unknown
  prepTime?: unknown
  cookTime?: unknown
  servings?: unknown
}) {
  expect(formData.title).toBeTruthy()
  expect(typeof formData.title).toBe('string')
  
  if (formData.ingredients) {
    expect(Array.isArray(formData.ingredients)).toBe(true)
    formData.ingredients.forEach((ing: {
      ingredient?: unknown
      amount?: unknown
    }) => {
      expect(ing.ingredient).toBeTruthy()
      expect(typeof ing.ingredient).toBe('string')
      if (ing.amount !== undefined) {
        expect(typeof ing.amount).toBe('number')
      }
    })
  }
  
  if (formData.instructions) {
    expect(Array.isArray(formData.instructions)).toBe(true)
    formData.instructions.forEach((inst: unknown) => {
      expect(inst).toBeTruthy()
      expect(typeof inst).toBe('string')
    })
  }
  
  if (formData.prepTime !== undefined) {
    expect(typeof formData.prepTime).toBe('number')
    expect(formData.prepTime).toBeGreaterThanOrEqual(0)
  }
  
  if (formData.cookTime !== undefined) {
    expect(typeof formData.cookTime).toBe('number')
    expect(formData.cookTime).toBeGreaterThanOrEqual(0)
  }
  
  if (formData.servings !== undefined) {
    expect(typeof formData.servings).toBe('number')
    expect(formData.servings).toBeGreaterThan(0)
  }
}

export function expectToContainRecipe(
  recipes: RecipeWithRelations[],
  expectedRecipe: Partial<RecipeWithRelations>
) {
  const found = recipes.find(r => {
    if (expectedRecipe.id && r.id !== expectedRecipe.id) return false
    if (expectedRecipe.title && r.title !== expectedRecipe.title) return false
    return true
  })
  
  expect(found).toBeDefined()
  if (found) {
    expectRecipeToMatch(found, expectedRecipe)
  }
}

export function expectRecipePhotoToBeValid(photo: {
  id?: unknown
  recipeId?: unknown
  photoUrl?: unknown
  isOriginal?: unknown
  uploadedBy?: unknown
  uploadedAt?: unknown
}) {
  expect(photo.id).toBeTruthy()
  expect(photo.recipeId).toBeTruthy()
  expect(photo.photoUrl).toBeTruthy()
  expect(photo.photoUrl).toMatch(/^https?:\/\//)
  expect(typeof photo.isOriginal).toBe('boolean')
  expect(photo.uploadedBy).toBeTruthy()
  expect(photo.uploadedAt).toBeTruthy()
}