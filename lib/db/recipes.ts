import { eq, and, or, ilike, desc, asc, sql, inArray } from 'drizzle-orm';
import { db, recipes, recipePhotos, favorites, recipeCategories, recipeCategoryMappings, ingredients, instructions, recipeTags, Recipe, NewRecipe, RecipePhoto, Ingredient, Instruction } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';

export interface RecipeWithRelations extends Recipe {
  photos: RecipePhoto[];
  categories?: typeof recipeCategories.$inferSelect[];
  ingredients?: Ingredient[];
  instructions?: Instruction[];
  tags?: string[];
  isFavorite: boolean;
}

export interface RecipeSearchParams {
  query?: string;
  categoryId?: string;
  tags?: string[];
  isPublic?: boolean;
  userId?: string;
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'title' | 'prepTime';
  orderDirection?: 'asc' | 'desc';
}

export interface RecipeListResponse {
  recipes: RecipeWithRelations[];
  total: number;
  hasMore: boolean;
}

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
  async createRecipe(input: Omit<NewRecipe, 'createdBy'> & { 
    ingredients?: string[];
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
      const ingredientRecords = ingredientsList.map((ingredient, index) => ({
        recipeId: recipe.id,
        ingredient,
        orderIndex: index,
      }));
      
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

    return recipe;
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

    return {
      ...recipe,
      categories: categories.length > 0 ? categories : undefined,
      ingredients: ingredientsList,
      instructions: instructionsList,
      tags: tagsList.map(t => t.tag),
      photos,
      isFavorite,
    };
  }

  /**
   * Update a recipe
   */
  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const [updated] = await db
      .update(recipes)
      .set({
        ...updates,
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
    
    return updated;
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // First check if recipe exists and user owns it
    const [existing] = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(
        and(
          eq(recipes.id, id),
          eq(recipes.createdBy, userId)
        )
      )
      .limit(1);
    
    if (!existing) {
      throw new Error('Recipe not found or not authorized');
    }
    
    // Delete the recipe
    await db
      .delete(recipes)
      .where(
        and(
          eq(recipes.id, id),
          eq(recipes.createdBy, userId)
        )
      );
  }

  /**
   * List recipes with filtering and pagination
   */
  async listRecipes(params: RecipeSearchParams = {}): Promise<RecipeListResponse> {
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
    if (params.userId) {
      conditions.push(eq(recipes.createdBy, params.userId));
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
      : params.orderBy === 'prepTime' ? recipes.prepTime
      : recipes.createdAt;
    
    const orderFunction = params.orderDirection === 'asc' ? asc : desc;

    let query = db.select().from(recipes);
    
    // Apply category filter if needed
    if (params.categoryId) {
      query = query
        .innerJoin(recipeCategoryMappings, eq(recipes.id, recipeCategoryMappings.recipeId))
        .where(and(whereClause, eq(recipeCategoryMappings.categoryId, params.categoryId)));
    } else if (whereClause) {
      query = query.where(whereClause);
    }

    const recipesList = await query
      .orderBy(orderFunction(orderColumn))
      .limit(limit)
      .offset(offset);

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
        ...recipe,
        categories: recipeCategories.length > 0 ? recipeCategories : undefined,
        photos: allPhotos.filter(p => p.recipeId === recipe.id),
        isFavorite: userFavorites.includes(recipe.id),
        tags: recipeTags,
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
        isOriginal: isPrimary,
        uploadedBy: userId,
      })
      .returning();

    return photo;
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
}