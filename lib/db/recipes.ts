import { eq, and, or, ilike, desc, asc, sql, inArray } from 'drizzle-orm';
import { db, recipes, recipePhotos, favorites, categories, Recipe, NewRecipe, RecipePhoto } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';

export interface RecipeWithRelations extends Recipe {
  photos: RecipePhoto[];
  category?: typeof categories.$inferSelect;
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
  private supabase = createClient();

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user?.id || null;
  }

  /**
   * Create a new recipe
   */
  async createRecipe(input: Omit<NewRecipe, 'userId'>): Promise<Recipe> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const [recipe] = await db
      .insert(recipes)
      .values({
        ...input,
        userId,
      })
      .returning();

    return recipe;
  }

  /**
   * Get a single recipe by ID with relations
   */
  async getRecipe(id: string): Promise<RecipeWithRelations | null> {
    const userId = await this.getCurrentUserId();

    // Get recipe with category
    const recipeWithCategory = await db
      .select({
        recipe: recipes,
        category: categories,
      })
      .from(recipes)
      .leftJoin(categories, eq(recipes.categoryId, categories.id))
      .where(eq(recipes.id, id))
      .limit(1);

    if (!recipeWithCategory.length) return null;

    const { recipe, category } = recipeWithCategory[0];

    // Get photos
    const photos = await db
      .select()
      .from(recipePhotos)
      .where(eq(recipePhotos.recipeId, id));

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
      category: category || undefined,
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
          eq(recipes.userId, userId) // Ensure user owns the recipe
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
          eq(recipes.userId, userId)
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
          eq(recipes.userId, userId)
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

    // Filter by category
    if (params.categoryId) {
      conditions.push(eq(recipes.categoryId, params.categoryId));
    }

    // Filter by public status
    if (params.isPublic !== undefined) {
      conditions.push(eq(recipes.isPublic, params.isPublic));
    }

    // Filter by user
    if (params.userId) {
      conditions.push(eq(recipes.userId, params.userId));
    }

    // Filter by tags
    if (params.tags && params.tags.length > 0) {
      conditions.push(
        sql`${recipes.tags} && ${params.tags}`
      );
    }

    // Build the query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(recipes)
      .where(whereClause);

    // Get recipes with category
    const orderColumn = params.orderBy === 'title' ? recipes.title 
      : params.orderBy === 'prepTime' ? recipes.prepTime
      : recipes.createdAt;
    
    const orderFunction = params.orderDirection === 'asc' ? asc : desc;

    const recipesWithCategory = await db
      .select({
        recipe: recipes,
        category: categories,
      })
      .from(recipes)
      .leftJoin(categories, eq(recipes.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderFunction(orderColumn))
      .limit(limit)
      .offset(offset);

    // Get photos for all recipes
    const recipeIds = recipesWithCategory.map(r => r.recipe.id);
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

    // Map recipes with relations
    const recipesWithRelations: RecipeWithRelations[] = recipesWithCategory.map(({ recipe, category }) => ({
      ...recipe,
      category: category || undefined,
      photos: allPhotos.filter(p => p.recipeId === recipe.id),
      isFavorite: userFavorites.includes(recipe.id),
    }));

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
  async addPhoto(recipeId: string, url: string, caption?: string, isPrimary: boolean = false): Promise<RecipePhoto> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify user owns the recipe
    const [recipe] = await db
      .select({ userId: recipes.userId })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe || recipe.userId !== userId) {
      throw new Error('Recipe not found or not authorized');
    }

    // If setting as primary, unset other primary photos
    if (isPrimary) {
      await db
        .update(recipePhotos)
        .set({ isPrimary: false })
        .where(eq(recipePhotos.recipeId, recipeId));
    }

    const [photo] = await db
      .insert(recipePhotos)
      .values({
        recipeId,
        url,
        caption,
        isPrimary,
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
          userId: recipes.userId,
        }
      })
      .from(recipePhotos)
      .innerJoin(recipes, eq(recipePhotos.recipeId, recipes.id))
      .where(eq(recipePhotos.id, photoId))
      .limit(1);

    if (!photo || photo.recipe.userId !== userId) {
      throw new Error('Photo not found or not authorized');
    }

    await db
      .delete(recipePhotos)
      .where(eq(recipePhotos.id, photoId));
  }
}