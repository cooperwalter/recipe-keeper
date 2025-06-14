'use server';

import { createClient } from '@/lib/supabase/server';
import { RecipeService } from '@/lib/db/recipes';
import { redirect } from 'next/navigation';

export default async function TestRecipePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  async function createTestRecipe() {
    'use server';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const recipeService = new RecipeService(supabase);
    
    // Get dessert category
    const { data: categories } = await supabase
      .from('recipe_categories')
      .select('*')
      .eq('slug', 'dessert')
      .single();
    
    const recipe = await recipeService.createRecipe({
      title: "Grandma's Chocolate Chip Cookies",
      description: "The best chocolate chip cookies you'll ever taste. Crispy on the outside, chewy on the inside.",
      ingredients: ["2 1/4 cups flour", "1 cup butter", "3/4 cup sugar", "2 eggs", "2 cups chocolate chips"],
      instructions: ["Preheat oven to 375°F", "Mix dry ingredients", "Cream butter and sugar", "Add eggs", "Fold in chocolate chips", "Bake for 10-12 minutes"],
      prepTime: 15,
      cookTime: 12,
      servings: 24,
      categoryId: categories?.id || null,
      tags: ["cookies", "dessert", "family-recipe"],
      isPublic: false,
      source: "Grandma Betty",
      notes: "Best served warm with milk"
    });
    
    redirect(`/protected/recipes/${recipe.id}`);
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Test Recipe Creation</h1>
      <p className="mb-4">Click the button below to create a test recipe.</p>
      <form action={createTestRecipe}>
        <button 
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Test Recipe
        </button>
      </form>
    </div>
  );
}