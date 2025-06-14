import { createClient } from '@/lib/supabase/client'
import type {
  Recipe,
  RecipeWithRelations,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeSearchParams,
  RecipeListResponse,
  Ingredient,
  Instruction,
  CreateIngredientInput,
  CreateInstructionInput,
  RecipePhoto,
  RecipeCategory,
} from '@/lib/types/recipe'

export class RecipeService {
  private supabase

  constructor(supabase?: any) {
    this.supabase = supabase || createClient()
  }

  /**
   * Create a new recipe
   */
  async createRecipe(input: CreateRecipeInput): Promise<Recipe> {
    const { data, error } = await this.supabase
      .from('recipes')
      .insert({
        title: input.title,
        description: input.description,
        prep_time: input.prepTime,
        cook_time: input.cookTime,
        servings: input.servings,
        is_public: input.isPublic || false,
        source_name: input.sourceName,
        source_notes: input.sourceNotes,
        created_by: (await this.supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapRecipe(data)
  }

  /**
   * Get a single recipe by ID
   */
  async getRecipe(id: string): Promise<RecipeWithRelations | null> {
    const { data: recipe, error } = await this.supabase
      .from('recipes')
      .select(`
        *,
        ingredients(*),
        instructions(*),
        recipe_photos(*),
        recipe_category_mappings(
          category:recipe_categories(*)
        ),
        recipe_tags(tag),
        favorites(user_id)
      `)
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!recipe) return null

    const user = await this.supabase.auth.getUser()
    const userId = user.data.user?.id

    return this.mapRecipeWithRelations(recipe, userId)
  }

  /**
   * Update a recipe
   */
  async updateRecipe(input: UpdateRecipeInput): Promise<Recipe> {
    const { id, ...updates } = input
    const { data, error } = await this.supabase
      .from('recipes')
      .update({
        title: updates.title,
        description: updates.description,
        prep_time: updates.prepTime,
        cook_time: updates.cookTime,
        servings: updates.servings,
        is_public: updates.isPublic,
        source_name: updates.sourceName,
        source_notes: updates.sourceNotes,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapRecipe(data)
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * List recipes with filtering and pagination
   */
  async listRecipes(params: RecipeSearchParams = {}): Promise<RecipeListResponse> {
    let query = this.supabase
      .from('recipes')
      .select(`
        *,
        ingredients(*),
        instructions(*),
        recipe_photos(*),
        recipe_category_mappings(
          category:recipe_categories(*)
        ),
        recipe_tags(tag),
        favorites(user_id)
      `, { count: 'exact' })

    // Apply filters
    if (params.query) {
      query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`)
    }

    if (params.isPublic !== undefined) {
      query = query.eq('is_public', params.isPublic)
    }

    if (params.createdBy) {
      query = query.eq('created_by', params.createdBy)
    }

    // Apply ordering
    const orderBy = params.orderBy || 'createdAt'
    const orderDirection = params.orderDirection || 'desc'
    const dbColumn = this.camelToSnake(orderBy)
    query = query.order(dbColumn, { ascending: orderDirection === 'asc' })

    // Apply pagination
    const limit = params.limit || 20
    const offset = params.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    const user = await this.supabase.auth.getUser()
    const userId = user.data.user?.id

    const recipes = (data || []).map(recipe => this.mapRecipeWithRelations(recipe, userId))

    // Filter by categories if specified
    let filteredRecipes = recipes
    if (params.categories && params.categories.length > 0) {
      filteredRecipes = recipes.filter(recipe =>
        recipe.categories.some(cat => params.categories!.includes(cat.slug))
      )
    }

    // Filter by tags if specified
    if (params.tags && params.tags.length > 0) {
      filteredRecipes = filteredRecipes.filter(recipe =>
        recipe.tags.some(tag => params.tags!.includes(tag))
      )
    }

    // Filter by favorite status if specified
    if (params.isFavorite !== undefined && userId) {
      filteredRecipes = filteredRecipes.filter(recipe =>
        recipe.isFavorite === params.isFavorite
      )
    }

    return {
      recipes: filteredRecipes,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    }
  }

  /**
   * Add ingredients to a recipe
   */
  async addIngredients(inputs: CreateIngredientInput[]): Promise<Ingredient[]> {
    const { data, error } = await this.supabase
      .from('ingredients')
      .insert(
        inputs.map(input => ({
          recipe_id: input.recipeId,
          ingredient: input.ingredient,
          amount: input.amount,
          unit: input.unit,
          order_index: input.orderIndex || 0,
          notes: input.notes,
        }))
      )
      .select()

    if (error) throw error
    return data.map(this.mapIngredient)
  }

  /**
   * Update ingredients for a recipe (replace all)
   */
  async updateIngredients(recipeId: string, inputs: CreateIngredientInput[]): Promise<Ingredient[]> {
    // Delete existing ingredients
    await this.supabase
      .from('ingredients')
      .delete()
      .eq('recipe_id', recipeId)

    // Add new ingredients
    if (inputs.length === 0) return []
    return this.addIngredients(inputs)
  }

  /**
   * Add instructions to a recipe
   */
  async addInstructions(inputs: CreateInstructionInput[]): Promise<Instruction[]> {
    const { data, error } = await this.supabase
      .from('instructions')
      .insert(
        inputs.map(input => ({
          recipe_id: input.recipeId,
          step_number: input.stepNumber,
          instruction: input.instruction,
        }))
      )
      .select()

    if (error) throw error
    return data.map(this.mapInstruction)
  }

  /**
   * Update instructions for a recipe (replace all)
   */
  async updateInstructions(recipeId: string, inputs: CreateInstructionInput[]): Promise<Instruction[]> {
    // Delete existing instructions
    await this.supabase
      .from('instructions')
      .delete()
      .eq('recipe_id', recipeId)

    // Add new instructions
    if (inputs.length === 0) return []
    return this.addInstructions(inputs)
  }

  /**
   * Toggle favorite status for a recipe
   */
  async toggleFavorite(recipeId: string): Promise<boolean> {
    const user = await this.supabase.auth.getUser()
    const userId = user.data.user?.id

    if (!userId) throw new Error('User not authenticated')

    // Check if already favorited
    const { data: existing } = await this.supabase
      .from('favorites')
      .select()
      .eq('recipe_id', recipeId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      // Remove favorite
      await this.supabase
        .from('favorites')
        .delete()
        .eq('recipe_id', recipeId)
        .eq('user_id', userId)
      return false
    } else {
      // Add favorite
      await this.supabase
        .from('favorites')
        .insert({
          recipe_id: recipeId,
          user_id: userId,
        })
      return true
    }
  }

  /**
   * Add tags to a recipe
   */
  async addTags(recipeId: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return

    const { error } = await this.supabase
      .from('recipe_tags')
      .insert(
        tags.map(tag => ({
          recipe_id: recipeId,
          tag: tag.toLowerCase().trim(),
        }))
      )

    if (error && error.code !== '23505') throw error // Ignore duplicate key errors
  }

  /**
   * Update tags for a recipe (replace all)
   */
  async updateTags(recipeId: string, tags: string[]): Promise<void> {
    // Delete existing tags
    await this.supabase
      .from('recipe_tags')
      .delete()
      .eq('recipe_id', recipeId)

    // Add new tags
    await this.addTags(recipeId, tags)
  }

  /**
   * Add category mappings to a recipe
   */
  async addCategories(recipeId: string, categoryIds: string[]): Promise<void> {
    if (categoryIds.length === 0) return

    const { error } = await this.supabase
      .from('recipe_category_mappings')
      .insert(
        categoryIds.map(categoryId => ({
          recipe_id: recipeId,
          category_id: categoryId,
        }))
      )

    if (error && error.code !== '23505') throw error // Ignore duplicate key errors
  }

  /**
   * Update category mappings for a recipe (replace all)
   */
  async updateCategories(recipeId: string, categoryIds: string[]): Promise<void> {
    // Delete existing mappings
    await this.supabase
      .from('recipe_category_mappings')
      .delete()
      .eq('recipe_id', recipeId)

    // Add new mappings
    await this.addCategories(recipeId, categoryIds)
  }

  // Helper methods
  private mapRecipe(data: {
    id: string
    title: string
    description?: string
    prep_time?: number
    cook_time?: number
    servings?: number
    created_by: string
    created_at: string
    updated_at: string
    is_public: boolean
    source_name?: string
    source_notes?: string
    version: number
    parent_recipe_id?: string
  }): Recipe {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      prepTime: data.prep_time,
      cookTime: data.cook_time,
      servings: data.servings,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isPublic: data.is_public,
      sourceName: data.source_name,
      sourceNotes: data.source_notes,
      version: data.version,
      parentRecipeId: data.parent_recipe_id,
    }
  }

  private mapRecipeWithRelations(data: {
    id: string
    title: string
    description?: string
    prep_time?: number
    cook_time?: number
    servings?: number
    created_by: string
    created_at: string
    updated_at: string
    is_public: boolean
    source_name?: string
    source_notes?: string
    version: number
    parent_recipe_id?: string
    ingredients?: Array<{
      id: string
      recipe_id: string
      ingredient: string
      amount?: number
      unit?: string
      order_index: number
      notes?: string
      created_at: string
    }>
    instructions?: Array<{
      id: string
      recipe_id: string
      step_number: number
      instruction: string
      created_at: string
    }>
    recipe_photos?: Array<{
      id: string
      recipe_id: string
      photo_url: string
      is_original: boolean
      caption?: string
      uploaded_by: string
      uploaded_at: string
    }>
    recipe_category_mappings?: Array<{
      category?: {
        id: string
        name: string
        slug: string
        created_at: string
      }
    }>
    recipe_tags?: Array<{ tag: string }>
    favorites?: Array<{ user_id: string }>
  }, userId?: string): RecipeWithRelations {
    return {
      ...this.mapRecipe(data),
      ingredients: (data.ingredients || []).map(this.mapIngredient),
      instructions: (data.instructions || []).map(this.mapInstruction),
      photos: (data.recipe_photos || []).map(this.mapPhoto),
      categories: (data.recipe_category_mappings || [])
        .map((m) => m.category)
        .filter(Boolean)
        .map((cat) => cat ? this.mapCategory(cat) : null)
        .filter((cat): cat is RecipeCategory => cat !== null),
      tags: (data.recipe_tags || []).map((t) => t.tag),
      isFavorite: userId ? (data.favorites || []).some((f) => f.user_id === userId) : false,
    }
  }

  private mapIngredient(data: {
    id: string
    recipe_id: string
    ingredient: string
    amount?: number
    unit?: string
    order_index: number
    notes?: string
    created_at: string
  }): Ingredient {
    return {
      id: data.id,
      recipeId: data.recipe_id,
      ingredient: data.ingredient,
      amount: data.amount,
      unit: data.unit,
      orderIndex: data.order_index,
      notes: data.notes,
      createdAt: data.created_at,
    }
  }

  private mapInstruction(data: {
    id: string
    recipe_id: string
    step_number: number
    instruction: string
    created_at: string
  }): Instruction {
    return {
      id: data.id,
      recipeId: data.recipe_id,
      stepNumber: data.step_number,
      instruction: data.instruction,
      createdAt: data.created_at,
    }
  }

  private mapPhoto(data: {
    id: string
    recipe_id: string
    photo_url: string
    is_original: boolean
    caption?: string
    uploaded_by: string
    uploaded_at: string
  }): RecipePhoto {
    return {
      id: data.id,
      recipeId: data.recipe_id,
      photoUrl: data.photo_url,
      isOriginal: data.is_original,
      caption: data.caption,
      uploadedBy: data.uploaded_by,
      uploadedAt: data.uploaded_at,
    }
  }

  private mapCategory(data: {
    id: string
    name: string
    slug: string
    created_at: string
  }): RecipeCategory {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      createdAt: data.created_at,
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }
}