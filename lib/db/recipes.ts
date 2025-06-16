import { eq, and, or, ilike, desc, asc, sql, inArray } from 'drizzle-orm';
import { db, recipes, recipePhotos, favorites, recipeCategories, recipeCategoryMappings, ingredients, instructions, recipeTags } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { fractionToDecimal } from '@/lib/utils/fractions';
import type { 
  RecipeWithRelations, 
  RecipeSearchParams, 
  RecipeListResponse,
  Recipe,
  RecipePhoto,
  CreateRecipeInput
} from '@/lib/types/recipe';

export class RecipeService {
  constructor(private supabase?: SupabaseClient) {}

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    if (!this.supabase) return null;
    const { data: { user } } = await this.supabase.auth.getUser();
    return user?.id || null;
  }

  /**
   * Create a new recipe
   */
  async createRecipe(input: CreateRecipeInput & { 
    ingredients?: (string | { ingredient: string; amount?: string; unit?: string; notes?: string })[];
    instructions?: string[];
    categoryId?: string | null;
    tags?: string[];
  }): Promise<Recipe> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Start a transaction
    const { ingredients: ingredientsList, instructions: instructionsList, categoryId, tags, ...recipeData } = input;
    
    // Create the recipe
    const [recipe] = await db
      .insert(recipes)
      .values({
        ...recipeData,
        createdBy: userId,
      })
      .returning();

    // Add ingredients if provided
    if (ingredientsList && ingredientsList.length > 0) {
      const ingredientRecords = ingredientsList.map((ingredient, index) => {
        // Handle both string and object formats
        if (typeof ingredient === 'string') {
          return {
            recipeId: recipe.id,
            ingredient,
            orderIndex: index,
          };
        } else {
          const decimalAmount = fractionToDecimal(ingredient.amount);
          return {
            recipeId: recipe.id,
            ingredient: ingredient.ingredient,
            amount: decimalAmount !== undefined ? decimalAmount.toString() : undefined,
            unit: ingredient.unit || undefined,
            notes: ingredient.notes || undefined,
            orderIndex: index,
          };
        }
      });
      
      await db.insert(ingredients).values(ingredientRecords);
    }

    // Add instructions if provided
    if (instructionsList && instructionsList.length > 0) {
      const instructionRecords = instructionsList.map((instruction, index) => ({
        recipeId: recipe.id,
        instruction,
        stepNumber: index + 1,
      }));
      
      await db.insert(instructions).values(instructionRecords);
    }

    // Add category mapping if provided
    if (categoryId) {
      await db.insert(recipeCategoryMappings).values({
        recipeId: recipe.id,
        categoryId,
      });
    }

    // Add tags if provided
    if (tags && tags.length > 0) {
      const tagRecords = tags.map(tag => ({
        recipeId: recipe.id,
        tag,
      }));
      
      await db.insert(recipeTags).values(tagRecords);
    }

    return {
      ...recipe,
      description: recipe.description || undefined,
      prepTime: recipe.prepTime || undefined,
      cookTime: recipe.cookTime || undefined,
      servings: recipe.servings || undefined,
      isPublic: recipe.isPublic || false,
      sourceName: recipe.sourceName || undefined,
      sourceNotes: recipe.sourceNotes || undefined,
      version: recipe.version || 1,
      parentRecipeId: recipe.parentRecipeId || undefined,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
    } as Recipe;
  }

  /**
   * Get a single recipe by ID with relations
   */
  async getRecipe(id: string): Promise<RecipeWithRelations | null> {
    const userId = await this.getCurrentUserId();

    // Get recipe
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, id))
      .limit(1);

    if (!recipe) return null;

    // Get photos
    const photos = await db
      .select()
      .from(recipePhotos)
      .where(eq(recipePhotos.recipeId, id));

    // Get categories
    const categoryMappings = await db
      .select({
        category: recipeCategories,
      })
      .from(recipeCategoryMappings)
      .innerJoin(recipeCategories, eq(recipeCategoryMappings.categoryId, recipeCategories.id))
      .where(eq(recipeCategoryMappings.recipeId, id));
    
    const categories = categoryMappings.map(m => m.category);

    // Get ingredients
    const ingredientsList = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.recipeId, id))
      .orderBy(asc(ingredients.orderIndex));

    // Get instructions
    const instructionsList = await db
      .select()
      .from(instructions)
      .where(eq(instructions.recipeId, id))
      .orderBy(asc(instructions.stepNumber));

    // Get tags
    const tagsList = await db
      .select({ tag: recipeTags.tag })
      .from(recipeTags)
      .where(eq(recipeTags.recipeId, id));

    // Check if favorited by current user
    let isFavorite = false;
    if (userId) {
      const favoriteCheck = await db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.recipeId, id),
            eq(favorites.userId, userId)
          )
        )
        .limit(1);
      
      isFavorite = favoriteCheck.length > 0;
    }

    const result: RecipeWithRelations = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description || undefined,
      prepTime: recipe.prepTime || undefined,
      cookTime: recipe.cookTime || undefined,
      servings: recipe.servings || undefined,
      createdBy: recipe.createdBy,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
      isPublic: recipe.isPublic || false,
      sourceName: recipe.sourceName || undefined,
      sourceNotes: recipe.sourceNotes || undefined,
      version: recipe.version || 1,
      parentRecipeId: recipe.parentRecipeId || undefined,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        createdAt: cat.createdAt.toISOString(),
      })),
      ingredients: ingredientsList.map(ing => ({
        id: ing.id,
        recipeId: ing.recipeId,
        ingredient: ing.ingredient,
        amount: ing.amount ? Number(ing.amount) : undefined,
        unit: ing.unit || undefined,
        orderIndex: ing.orderIndex,
        notes: ing.notes || undefined,
        createdAt: ing.createdAt.toISOString(),
      })),
      instructions: instructionsList.map(inst => ({
        id: inst.id,
        recipeId: inst.recipeId,
        stepNumber: inst.stepNumber,
        instruction: inst.instruction,
        createdAt: inst.createdAt.toISOString(),
      })),
      tags: tagsList.map(t => t.tag),
      photos: photos.map(p => ({
        id: p.id,
        recipeId: p.recipeId,
        photoUrl: p.photoUrl,
        isOriginal: p.isOriginal || false,
        caption: p.caption || undefined,
        uploadedBy: p.uploadedBy,
        uploadedAt: p.uploadedAt.toISOString(),
      })),
      isFavorite,
    };
    
    return result;
  }

  /**
   * Update a recipe
   */
  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Convert string dates to Date objects if present
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.createdAt) {
      dbUpdates.createdAt = new Date(updates.createdAt);
    }
    if (updates.updatedAt) {
      dbUpdates.updatedAt = new Date(updates.updatedAt);
    }
    
    const [updated] = await db
      .update(recipes)
      .set({
        ...dbUpdates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recipes.id, id),
          eq(recipes.createdBy, userId) // Ensure user owns the recipe
        )
      )
      .returning();

    if (!updated) throw new Error('Recipe not found or not authorized');
    
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    } as Recipe;
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // First check if recipe exists
    const [existing] = await db
      .select({ 
        id: recipes.id,
        createdBy: recipes.createdBy,
        title: recipes.title 
      })
      .from(recipes)
      .where(eq(recipes.id, id))
      .limit(1);
    
    if (!existing) {
      throw new Error('Recipe not found');
    }
    
    // Check if user owns the recipe
    if (existing.createdBy !== userId) {
      console.error(`Delete authorization failed: recipe owner=${existing.createdBy}, current user=${userId}`);
      throw new Error('Not authorized to delete this recipe');
    }
    
    // Delete the recipe (cascade will handle related records)
    await db
      .delete(recipes)
      .where(eq(recipes.id, id));
  }

  /**
   * List recipes with filtering and pagination
   */
  async listRecipes(params: RecipeSearchParams & { categoryId?: string } = {}): Promise<RecipeListResponse> {
    const userId = await this.getCurrentUserId();
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    // Build where conditions
    const conditions = [];

    // Search by title or description
    if (params.query) {
      conditions.push(
        or(
          ilike(recipes.title, `%${params.query}%`),
          ilike(recipes.description, `%${params.query}%`)
        )
      );
    }

    // Filter by category - requires join with category mappings
    // This will be handled separately below

    // Filter by public status
    if (params.isPublic !== undefined) {
      conditions.push(eq(recipes.isPublic, params.isPublic));
    }

    // Filter by user
    if (params.createdBy) {
      conditions.push(eq(recipes.createdBy, params.createdBy));
    }

    // Filter by tags - will need to join with recipe_tags table
    // TODO: Implement tag filtering with the new schema

    // Build the query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(recipes)
      .where(whereClause);

    // Get recipes
    const orderColumn = params.orderBy === 'title' ? recipes.title 
      : params.orderBy === 'updatedAt' ? recipes.updatedAt
      : recipes.createdAt;
    
    const orderFunction = params.orderDirection === 'asc' ? asc : desc;

    let recipesList: Array<typeof recipes.$inferSelect | { recipe: typeof recipes.$inferSelect }>;
    
    // Apply category filter if needed
    if (params.categoryId) {
      const conditions = whereClause 
        ? and(whereClause, eq(recipeCategoryMappings.categoryId, params.categoryId))
        : eq(recipeCategoryMappings.categoryId, params.categoryId);
        
      recipesList = await db
        .select({ recipe: recipes })
        .from(recipes)
        .innerJoin(recipeCategoryMappings, eq(recipes.id, recipeCategoryMappings.recipeId))
        .where(conditions)
        .orderBy(orderFunction(orderColumn))
        .limit(limit)
        .offset(offset);
    } else {
      recipesList = await db
        .select()
        .from(recipes)
        .where(whereClause)
        .orderBy(orderFunction(orderColumn))
        .limit(limit)
        .offset(offset);
    }

    // Get photos for all recipes
    const recipeIds = recipesList.map(r => 'recipe' in r ? r.recipe.id : r.id);
    const allPhotos = recipeIds.length > 0 
      ? await db
          .select()
          .from(recipePhotos)
          .where(inArray(recipePhotos.recipeId, recipeIds))
      : [];

    // Get favorites for current user
    let userFavorites: string[] = [];
    if (userId && recipeIds.length > 0) {
      const favs = await db
        .select({ recipeId: favorites.recipeId })
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            inArray(favorites.recipeId, recipeIds)
          )
        );
      userFavorites = favs.map(f => f.recipeId);
    }

    // Get categories for all recipes
    const allCategoryMappings = recipeIds.length > 0
      ? await db
          .select({
            recipeId: recipeCategoryMappings.recipeId,
            category: recipeCategories,
          })
          .from(recipeCategoryMappings)
          .innerJoin(recipeCategories, eq(recipeCategoryMappings.categoryId, recipeCategories.id))
          .where(inArray(recipeCategoryMappings.recipeId, recipeIds))
      : [];

    // Get tags for all recipes
    const allTags = recipeIds.length > 0
      ? await db
          .select({
            recipeId: recipeTags.recipeId,
            tag: recipeTags.tag,
          })
          .from(recipeTags)
          .where(inArray(recipeTags.recipeId, recipeIds))
      : [];

    // Map recipes with relations
    const recipesWithRelations: RecipeWithRelations[] = recipesList.map((item) => {
      const recipe = 'recipe' in item ? item.recipe : item;
      const recipeCategories = allCategoryMappings
        .filter(m => m.recipeId === recipe.id)
        .map(m => m.category);
      const recipeTags = allTags
        .filter(t => t.recipeId === recipe.id)
        .map(t => t.tag);
      
      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description || undefined,
        prepTime: recipe.prepTime || undefined,
        cookTime: recipe.cookTime || undefined,
        servings: recipe.servings || undefined,
        createdBy: recipe.createdBy,
        createdAt: recipe.createdAt.toISOString(),
        updatedAt: recipe.updatedAt.toISOString(),
        isPublic: recipe.isPublic || false,
        sourceName: recipe.sourceName || undefined,
        sourceNotes: recipe.sourceNotes || undefined,
        version: recipe.version || 1,
        parentRecipeId: recipe.parentRecipeId || undefined,
        categories: recipeCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          createdAt: cat.createdAt.toISOString(),
        })),
        photos: allPhotos.filter(p => p.recipeId === recipe.id).map(p => ({
          id: p.id,
          recipeId: p.recipeId,
          photoUrl: p.photoUrl,
          isOriginal: p.isOriginal || false,
          caption: p.caption || undefined,
          uploadedBy: p.uploadedBy,
          uploadedAt: p.uploadedAt.toISOString(),
        })),
        isFavorite: userFavorites.includes(recipe.id),
        tags: recipeTags,
        ingredients: [],
        instructions: [],
      };
    });

    // Apply favorite filter if needed
    let filteredRecipes = recipesWithRelations;
    if (params.isFavorite !== undefined) {
      filteredRecipes = recipesWithRelations.filter(r => r.isFavorite === params.isFavorite);
    }

    return {
      recipes: filteredRecipes,
      total: count,
      hasMore: count > offset + limit,
    };
  }

  /**
   * Toggle favorite status for a recipe
   */
  async toggleFavorite(recipeId: string): Promise<boolean> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Check if already favorited
    const existing = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.recipeId, recipeId),
          eq(favorites.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Remove favorite
      await db
        .delete(favorites)
        .where(
          and(
            eq(favorites.recipeId, recipeId),
            eq(favorites.userId, userId)
          )
        );
      return false;
    } else {
      // Add favorite
      await db
        .insert(favorites)
        .values({
          recipeId,
          userId,
        });
      return true;
    }
  }

  /**
   * Add photo to recipe
   */
  async addRecipePhoto(recipeId: string, url: string, caption?: string, isOriginal: boolean = false): Promise<RecipePhoto> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify user owns the recipe
    const [recipe] = await db
      .select({ createdBy: recipes.createdBy })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe || recipe.createdBy !== userId) {
      throw new Error('Recipe not found or not authorized');
    }

    // Note: isOriginal is used instead of isPrimary in the new schema
    const [photo] = await db
      .insert(recipePhotos)
      .values({
        recipeId,
        photoUrl: url,
        caption,
        isOriginal: isOriginal,
        uploadedBy: userId,
      })
      .returning();

    return {
      ...photo,
      isOriginal: photo.isOriginal || false,
      caption: photo.caption || undefined,
      uploadedAt: photo.uploadedAt.toISOString(),
    } as RecipePhoto;
  }

  /**
   * Delete photo from recipe
   */
  async deletePhoto(photoId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify user owns the recipe
    const [photo] = await db
      .select({
        recipe: {
          createdBy: recipes.createdBy,
        }
      })
      .from(recipePhotos)
      .innerJoin(recipes, eq(recipePhotos.recipeId, recipes.id))
      .where(eq(recipePhotos.id, photoId))
      .limit(1);

    if (!photo || photo.recipe.createdBy !== userId) {
      throw new Error('Photo not found or not authorized');
    }

    await db
      .delete(recipePhotos)
      .where(eq(recipePhotos.id, photoId));
  }

  /**
   * Update ingredients for a recipe
   */
  async updateIngredients(recipeId: string, newIngredients: Array<{
    recipeId: string;
    ingredient: string;
    amount?: number | string;
    unit?: string;
    orderIndex: number;
    notes?: string;
  }>): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify user owns the recipe
    const [recipe] = await db
      .select({ createdBy: recipes.createdBy })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe || recipe.createdBy !== userId) {
      throw new Error('Recipe not found or not authorized');
    }

    // Delete existing ingredients
    await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));

    // Insert new ingredients
    if (newIngredients.length > 0) {
      const ingredientRecords = newIngredients.map(ing => ({
        ...ing,
        amount: ing.amount !== undefined ? ing.amount.toString() : undefined,
      }));
      await db.insert(ingredients).values(ingredientRecords);
    }
  }

  /**
   * Update instructions for a recipe
   */
  async updateInstructions(recipeId: string, newInstructions: Array<{
    recipeId: string;
    stepNumber: number;
    instruction: string;
  }>): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify user owns the recipe
    const [recipe] = await db
      .select({ createdBy: recipes.createdBy })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe || recipe.createdBy !== userId) {
      throw new Error('Recipe not found or not authorized');
    }

    // Delete existing instructions
    await db.delete(instructions).where(eq(instructions.recipeId, recipeId));

    // Insert new instructions
    if (newInstructions.length > 0) {
      await db.insert(instructions).values(newInstructions);
    }
  }

  /**
   * Update categories for a recipe
   */
  async updateCategories(recipeId: string, categoryIds: string[]): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify user owns the recipe
    const [recipe] = await db
      .select({ createdBy: recipes.createdBy })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe || recipe.createdBy !== userId) {
      throw new Error('Recipe not found or not authorized');
    }

    // Delete existing category mappings
    await db.delete(recipeCategoryMappings).where(eq(recipeCategoryMappings.recipeId, recipeId));

    // Insert new category mappings
    if (categoryIds.length > 0) {
      await db.insert(recipeCategoryMappings).values(
        categoryIds.map(categoryId => ({
          recipeId,
          categoryId,
        }))
      );
    }
  }

  /**
   * Update tags for a recipe
   */
  async updateTags(recipeId: string, newTags: string[]): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify user owns the recipe
    const [recipe] = await db
      .select({ createdBy: recipes.createdBy })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe || recipe.createdBy !== userId) {
      throw new Error('Recipe not found or not authorized');
    }

    // Delete existing tags
    await db.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId));

    // Insert new tags
    if (newTags.length > 0) {
      await db.insert(recipeTags).values(
        newTags.map(tag => ({
          recipeId,
          tag,
        }))
      );
    }
  }
}