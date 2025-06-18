import { eq, and, or, ilike, desc, asc, sql, inArray } from 'drizzle-orm';
import { db, recipes, recipePhotos, favorites, recipeCategories, recipeCategoryMappings, ingredients, instructions, recipeTags, recipeVersions } from '@/lib/db';
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
import type { RecipeVersion } from '@/lib/db/schema';

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
      const validIngredients = ingredientsList.filter(ing => {
        if (typeof ing === 'string') {
          return ing.trim().length > 0;
        }
        return ing.ingredient && ing.ingredient.trim().length > 0;
      });
      
      if (validIngredients.length > 0) {
        const ingredientRecords = validIngredients.map((ingredient, index) => {
          // Handle both string and object formats
          if (typeof ingredient === 'string') {
            return {
              recipeId: recipe.id,
              ingredient: ingredient.trim(),
              orderIndex: index,
            };
          } else {
            const decimalAmount = fractionToDecimal(ingredient.amount);
            return {
              recipeId: recipe.id,
              ingredient: ingredient.ingredient.trim(),
              amount: decimalAmount !== undefined ? decimalAmount.toString() : undefined,
              unit: ingredient.unit || undefined,
              notes: ingredient.notes || undefined,
              orderIndex: index,
            };
          }
        });
        
        await db.insert(ingredients).values(ingredientRecords);
      }
    }

    // Add instructions if provided
    if (instructionsList && instructionsList.length > 0) {
      // Filter out empty instructions
      const validInstructions = instructionsList.filter(inst => inst && inst.trim());
      
      if (validInstructions.length > 0) {
        const instructionRecords = validInstructions.map((instruction, index) => ({
          recipeId: recipe.id,
          instruction: instruction.trim(),
          stepNumber: index + 1,
        }));
        
        await db.insert(instructions).values(instructionRecords);
      }
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
      ingredientAdjustments: recipe.ingredientAdjustments as Record<string, number> | undefined,
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
      ingredientAdjustments: recipe.ingredientAdjustments as Record<string, number> | undefined,
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
   * Create a version snapshot of a recipe
   */
  private async createVersionSnapshot(recipeId: string, changeSummary?: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Get the current recipe with all relations
    const currentRecipe = await this.getRecipe(recipeId);
    if (!currentRecipe) throw new Error('Recipe not found');

    // Get the current version number
    const [latestVersion] = await db
      .select({ versionNumber: recipeVersions.versionNumber })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId))
      .orderBy(desc(recipeVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    // Create snapshot data
    const snapshot = {
      title: currentRecipe.title,
      description: currentRecipe.description,
      prepTime: currentRecipe.prepTime,
      cookTime: currentRecipe.cookTime,
      servings: currentRecipe.servings,
      sourceName: currentRecipe.sourceName,
      sourceNotes: currentRecipe.sourceNotes,
      ingredients: currentRecipe.ingredients,
      instructions: currentRecipe.instructions,
      tags: currentRecipe.tags,
      categories: currentRecipe.categories,
      photos: currentRecipe.photos.map(p => ({
        photoUrl: p.photoUrl,
        isOriginal: p.isOriginal,
        caption: p.caption
      }))
    };

    // Insert version
    await db.insert(recipeVersions).values({
      recipeId,
      versionNumber: nextVersionNumber,
      changeSummary: changeSummary || 'Recipe updated',
      changedBy: userId,
      recipeData: snapshot
    });

    // Update recipe version number
    await db
      .update(recipes)
      .set({ version: nextVersionNumber })
      .where(eq(recipes.id, recipeId));
  }

  /**
   * Update a recipe (with automatic version creation)
   */
  async updateRecipe(id: string, updates: Partial<Recipe>, createVersion = true, changeSummary?: string): Promise<Recipe> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // First check if recipe exists and get owner info
    const [existing] = await db
      .select({ 
        id: recipes.id,
        createdBy: recipes.createdBy,
        title: recipes.title,
        sourceName: recipes.sourceName
      })
      .from(recipes)
      .where(eq(recipes.id, id))
      .limit(1);
    
    if (!existing) {
      throw new Error('Recipe not found');
    }
    
    // Check if user owns the recipe
    if (existing.createdBy !== userId) {
      // Special case for demo environment: allow demo users to update demo recipes
      const { data: { user } } = await this.supabase!.auth.getUser();
      const isDemoUser = user?.email === 'demo@recipekeeper.com';
      const isDemoRecipe = existing.sourceName?.includes('Demo') || 
                          existing.sourceName?.includes('Grandma') ||
                          existing.title.includes('Pancake') ||
                          existing.title.includes('Apple Pie');
      
      if (!(isDemoUser && isDemoRecipe)) {
        console.error(`Update authorization failed: recipe owner=${existing.createdBy}, current user=${userId}`);
        throw new Error('Not authorized to update this recipe');
      }
    }

    // Create version snapshot before updating (if requested)
    if (createVersion) {
      try {
        await this.createVersionSnapshot(id, changeSummary);
      } catch (error) {
        console.error('Failed to create version snapshot:', error);
        // Continue with update even if versioning fails
      }
    }

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
      .where(eq(recipes.id, id))
      .returning();

    if (!updated) throw new Error('Failed to update recipe');
    
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
        title: recipes.title,
        sourceName: recipes.sourceName
      })
      .from(recipes)
      .where(eq(recipes.id, id))
      .limit(1);
    
    if (!existing) {
      throw new Error('Recipe not found');
    }
    
    // Check if user owns the recipe
    if (existing.createdBy !== userId) {
      // Special case for demo environment: allow demo users to delete demo recipes
      const { data: { user } } = await this.supabase!.auth.getUser();
      const isDemoUser = user?.email === 'demo@recipekeeper.com';
      const isDemoRecipe = existing.sourceName?.includes('Demo') || 
                          existing.sourceName?.includes('Grandma') ||
                          existing.title.includes('Pancake') ||
                          existing.title.includes('Apple Pie');
      
      if (!(isDemoUser && isDemoRecipe)) {
        console.error(`Delete authorization failed: recipe owner=${existing.createdBy}, current user=${userId}`);
        throw new Error('Not authorized to delete this recipe');
      }
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
      // Filter out invalid ingredients (must have at least an ingredient name)
      const validIngredients = newIngredients.filter(ing => ing.ingredient && ing.ingredient.trim());
      
      if (validIngredients.length > 0) {
        const ingredientRecords = validIngredients.map(ing => ({
          ...ing,
          ingredient: ing.ingredient.trim(),
          amount: ing.amount !== undefined ? ing.amount.toString() : undefined,
        }));
        await db.insert(ingredients).values(ingredientRecords);
      }
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
      // Filter out empty instructions
      const validInstructions = newInstructions.filter(inst => inst.instruction && inst.instruction.trim());
      
      if (validInstructions.length > 0) {
        const instructionRecords = validInstructions.map(inst => ({
          ...inst,
          instruction: inst.instruction.trim(),
        }));
        await db.insert(instructions).values(instructionRecords);
      }
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

  /**
   * Get version history for a recipe
   */
  async getVersionHistory(recipeId: string): Promise<RecipeVersion[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify recipe exists
    const [recipe] = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Get all versions
    const versions = await db
      .select()
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId))
      .orderBy(desc(recipeVersions.versionNumber));

    return versions;
  }

  /**
   * Get a specific version of a recipe
   */
  async getRecipeVersion(recipeId: string, versionNumber: number): Promise<RecipeVersion | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify recipe exists
    const [recipe] = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Get specific version
    const [version] = await db
      .select()
      .from(recipeVersions)
      .where(
        and(
          eq(recipeVersions.recipeId, recipeId),
          eq(recipeVersions.versionNumber, versionNumber)
        )
      )
      .limit(1);

    return version || null;
  }

  /**
   * Restore a recipe to a previous version
   */
  async restoreVersion(recipeId: string, versionNumber: number): Promise<Recipe> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Verify user owns the recipe before allowing restore
    const [recipe] = await db
      .select({ createdBy: recipes.createdBy })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe || recipe.createdBy !== userId) {
      throw new Error('Not authorized to restore this recipe');
    }

    // Get the version to restore
    const version = await this.getRecipeVersion(recipeId, versionNumber);
    if (!version) throw new Error('Version not found');

    // Extract recipe data from the version
    const versionData = version.recipeData as {
      title: string;
      description?: string;
      prepTime?: number;
      cookTime?: number;
      servings?: number;
      sourceName?: string;
      sourceNotes?: string;
      ingredients?: Array<{
        recipeId: string;
        ingredient: string;
        amount?: number | string;
        unit?: string;
        orderIndex: number;
        notes?: string;
      }>;
      instructions?: Array<{
        recipeId: string;
        stepNumber: number;
        instruction: string;
      }>;
      tags?: string[];
    };

    // Create a snapshot of current state before restoring
    await this.createVersionSnapshot(recipeId, `Restored to version ${versionNumber}`);

    // Update the recipe with version data
    const updated = await this.updateRecipe(
      recipeId,
      {
        title: versionData.title,
        description: versionData.description,
        prepTime: versionData.prepTime,
        cookTime: versionData.cookTime,
        servings: versionData.servings,
        sourceName: versionData.sourceName,
        sourceNotes: versionData.sourceNotes,
      },
      false // Don't create another version
    );

    // Update ingredients
    if (versionData.ingredients) {
      await this.updateIngredients(recipeId, versionData.ingredients);
    }

    // Update instructions
    if (versionData.instructions) {
      await this.updateInstructions(recipeId, versionData.instructions);
    }

    // Update tags
    if (versionData.tags) {
      await this.updateTags(recipeId, versionData.tags);
    }

    return updated;
  }

  /**
   * Get current recipe as a RecipeVersion object
   */
  private async getCurrentVersionAsRecipeVersion(recipeId: string): Promise<RecipeVersion | null> {
    const recipe = await this.getRecipe(recipeId);
    if (!recipe) return null;

    // Get the latest version number
    const [latestVersion] = await db
      .select({ versionNumber: recipeVersions.versionNumber })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId))
      .orderBy(desc(recipeVersions.versionNumber))
      .limit(1);

    const currentVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Format as RecipeVersion
    return {
      id: `current-${recipeId}`,
      recipeId,
      versionNumber: currentVersionNumber,
      recipeData: {
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        sourceName: recipe.sourceName,
        sourceNotes: recipe.sourceNotes,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tags: recipe.tags,
        photos: recipe.photos,
      },
      changeSummary: 'Current version',
      changedBy: recipe.createdBy,
      changedAt: new Date(recipe.updatedAt),
    };
  }

  /**
   * Compare two versions of a recipe
   */
  async compareVersions(recipeId: string, version1: number, version2: number): Promise<{
    version1: RecipeVersion | null;
    version2: RecipeVersion | null;
    differences: {
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }[];
  }> {
    // Handle -1 as current version
    const v1 = version1 === -1 
      ? await this.getCurrentVersionAsRecipeVersion(recipeId)
      : await this.getRecipeVersion(recipeId, version1);
    const v2 = version2 === -1 
      ? await this.getCurrentVersionAsRecipeVersion(recipeId)
      : await this.getRecipeVersion(recipeId, version2);

    const differences: { field: string; oldValue: unknown; newValue: unknown }[] = [];

    if (v1 && v2) {
      const data1 = v1.recipeData as Record<string, unknown>;
      const data2 = v2.recipeData as Record<string, unknown>;

      // Compare basic fields
      const fields = ['title', 'description', 'prepTime', 'cookTime', 'servings', 'sourceName', 'sourceNotes'];
      for (const field of fields) {
        if (data1[field] !== data2[field]) {
          differences.push({
            field,
            oldValue: data1[field],
            newValue: data2[field]
          });
        }
      }

      // Compare arrays
      if (JSON.stringify(data1.ingredients) !== JSON.stringify(data2.ingredients)) {
        differences.push({
          field: 'ingredients',
          oldValue: data1.ingredients,
          newValue: data2.ingredients
        });
      }

      if (JSON.stringify(data1.instructions) !== JSON.stringify(data2.instructions)) {
        differences.push({
          field: 'instructions',
          oldValue: data1.instructions,
          newValue: data2.instructions
        });
      }

      if (JSON.stringify(data1.tags) !== JSON.stringify(data2.tags)) {
        differences.push({
          field: 'tags',
          oldValue: data1.tags,
          newValue: data2.tags
        });
      }
    }

    return {
      version1: v1,
      version2: v2,
      differences
    };
  }
}