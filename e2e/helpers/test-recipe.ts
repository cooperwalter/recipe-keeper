export const testRecipe = {
  id: 'test-recipe-id',
  title: 'Test Recipe',
  description: 'A test recipe',
  servings: 4,
  prepTime: 15,
  cookTime: 30,
  createdBy: 'test-user-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPublic: false,
  isFavorite: false,
  version: 1,
  ingredients: [
    {
      id: 'ing-1',
      recipeId: 'test-recipe-id',
      ingredient: 'flour',
      amount: '2',
      unit: 'cups',
      orderIndex: 0,
      notes: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'ing-2',
      recipeId: 'test-recipe-id',
      ingredient: 'salt',
      amount: null,
      unit: null,
      orderIndex: 1,
      notes: 'to taste',
      createdAt: new Date().toISOString()
    }
  ],
  instructions: [
    {
      id: 'inst-1',
      recipeId: 'test-recipe-id',
      stepNumber: 1,
      instruction: 'Mix ingredients',
      createdAt: new Date().toISOString()
    }
  ],
  photos: [],
  tags: [],
  categories: []
}