import { createClient } from '@/lib/supabase/client';

async function testRecipeCreation() {
  console.log('Testing recipe creation...\n');
  
  // Create a Supabase client
  const supabase = createClient();
  
  // Sign in as demo user
  console.log('1. Signing in as demo user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo@recipeandme.app',
    password: 'DemoRecipes2024!'
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('✅ Signed in successfully');
  
  // Create a test recipe
  console.log('\n2. Creating test recipe...');
  const recipeData = {
    title: "Test Apple Pie Recipe",
    description: "A test recipe to verify the system is working",
    ingredients: ["2 cups flour", "1 cup sugar", "6 apples", "1 tsp cinnamon"],
    instructions: ["Mix ingredients", "Bake at 350F for 45 minutes"],
    prepTime: 20,
    cookTime: 45,
    servings: 8,
    categoryId: null, // We'll skip category for simplicity
    tags: ["test", "dessert"],
    isPublic: false,
    source: "Test Script"
  };
  
  const response = await fetch('http://localhost:3002/api/recipes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session?.access_token}`
    },
    body: JSON.stringify(recipeData)
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Failed to create recipe:', response.status, error);
    return;
  }
  
  const recipe = await response.json();
  console.log('✅ Recipe created successfully!');
  console.log('Recipe ID:', recipe.id);
  console.log('Recipe Title:', recipe.title);
  
  // Verify we can fetch the recipe
  console.log('\n3. Fetching created recipe...');
  const fetchResponse = await fetch(`http://localhost:3002/api/recipes/${recipe.id}`, {
    headers: {
      'Authorization': `Bearer ${authData.session?.access_token}`
    }
  });
  
  if (!fetchResponse.ok) {
    console.error('❌ Failed to fetch recipe');
    return;
  }
  
  const fetchedRecipe = await fetchResponse.json();
  console.log('✅ Recipe fetched successfully!');
  console.log('Fetched recipe title:', fetchedRecipe.title);
  
  console.log('\n✅ All tests passed! Recipe creation is working.');
}

// Run the test
testRecipeCreation().catch(console.error);