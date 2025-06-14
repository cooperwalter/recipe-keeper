import { db, recipeCategories, RecipeCategory, NewRecipeCategory } from '@/lib/db';
import { eq } from 'drizzle-orm';

export class CategoryService {
  /**
   * Get all categories
   */
  async getCategories(): Promise<RecipeCategory[]> {
    return await db.select().from(recipeCategories);
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: string): Promise<RecipeCategory | null> {
    const [category] = await db
      .select()
      .from(recipeCategories)
      .where(eq(recipeCategories.id, id))
      .limit(1);
    
    return category || null;
  }

  /**
   * Get a category by name
   */
  async getCategoryByName(name: string): Promise<RecipeCategory | null> {
    const [category] = await db
      .select()
      .from(recipeCategories)
      .where(eq(recipeCategories.name, name))
      .limit(1);
    
    return category || null;
  }

  /**
   * Get a category by slug
   */
  async getCategoryBySlug(slug: string): Promise<RecipeCategory | null> {
    const [category] = await db
      .select()
      .from(recipeCategories)
      .where(eq(recipeCategories.slug, slug))
      .limit(1);
    
    return category || null;
  }

  /**
   * Create a new category (admin only)
   */
  async createCategory(input: NewRecipeCategory): Promise<RecipeCategory> {
    const [category] = await db
      .insert(recipeCategories)
      .values(input)
      .returning();
    
    return category;
  }

  /**
   * Update a category (admin only)
   */
  async updateCategory(id: string, updates: Partial<RecipeCategory>): Promise<RecipeCategory> {
    const [updated] = await db
      .update(recipeCategories)
      .set(updates)
      .where(eq(recipeCategories.id, id))
      .returning();
    
    if (!updated) throw new Error('Category not found');
    
    return updated;
  }

  /**
   * Delete a category (admin only)
   */
  async deleteCategory(id: string): Promise<void> {
    // First check if category exists
    const [existing] = await db
      .select({ id: recipeCategories.id })
      .from(recipeCategories)
      .where(eq(recipeCategories.id, id))
      .limit(1);
    
    if (!existing) {
      throw new Error('Category not found');
    }
    
    await db
      .delete(recipeCategories)
      .where(eq(recipeCategories.id, id));
  }
}