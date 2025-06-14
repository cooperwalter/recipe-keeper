import { db, categories, Category, NewCategory } from '@/lib/db';
import { eq } from 'drizzle-orm';

export class CategoryService {
  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: string): Promise<Category | null> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    
    return category || null;
  }

  /**
   * Get a category by name
   */
  async getCategoryByName(name: string): Promise<Category | null> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, name))
      .limit(1);
    
    return category || null;
  }

  /**
   * Create a new category (admin only)
   */
  async createCategory(input: NewCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(input)
      .returning();
    
    return category;
  }

  /**
   * Update a category (admin only)
   */
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
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
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    
    if (!existing) {
      throw new Error('Category not found');
    }
    
    await db
      .delete(categories)
      .where(eq(categories.id, id));
  }
}