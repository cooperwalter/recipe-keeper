export interface Recipe {
  id: string
  title: string
  description?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  createdBy: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  sourceName?: string
  sourceNotes?: string
  version: number
  parentRecipeId?: string
}

export interface Ingredient {
  id: string
  recipeId: string
  ingredient: string
  amount?: number
  unit?: string
  orderIndex: number
  notes?: string
  createdAt: string
}

export interface Instruction {
  id: string
  recipeId: string
  stepNumber: number
  instruction: string
  createdAt: string
}

export interface RecipePhoto {
  id: string
  recipeId: string
  photoUrl: string
  isOriginal: boolean
  caption?: string
  uploadedBy: string
  uploadedAt: string
}

export interface RecipeCategory {
  id: string
  name: string
  slug: string
  createdAt: string
}

export interface RecipeCategoryMapping {
  id: string
  recipeId: string
  categoryId: string
  createdAt: string
}

export interface RecipeTag {
  id: string
  recipeId: string
  tag: string
  createdAt: string
}

export interface RecipeVersion {
  id: string
  recipeId: string
  versionNumber: number
  changeSummary?: string
  changedBy: string
  changedAt: string
  recipeData: {
    title: string
    description?: string
    prepTime?: number
    cookTime?: number
    servings?: number
    sourceName?: string
    sourceNotes?: string
  }
}

export interface Favorite {
  id: string
  recipeId: string
  userId: string
  createdAt: string
}

// Input types for creating/updating
export interface CreateRecipeInput {
  title: string
  description?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  isPublic?: boolean
  sourceName?: string
  sourceNotes?: string
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  id: string
}

export interface CreateIngredientInput {
  recipeId: string
  ingredient: string
  amount?: number
  unit?: string
  orderIndex?: number
  notes?: string
}

export interface CreateInstructionInput {
  recipeId: string
  stepNumber: number
  instruction: string
}

// Complete recipe with all related data
export interface RecipeWithRelations extends Recipe {
  ingredients: Ingredient[]
  instructions: Instruction[]
  photos: RecipePhoto[]
  categories: RecipeCategory[]
  tags: string[]
  isFavorite?: boolean
}

// Search and filter types
export interface RecipeSearchParams {
  query?: string
  categories?: string[]
  tags?: string[]
  createdBy?: string
  isPublic?: boolean
  isFavorite?: boolean
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'title'
  orderDirection?: 'asc' | 'desc'
}

// Response types
export interface RecipeListResponse {
  recipes: RecipeWithRelations[]
  total: number
  hasMore: boolean
}