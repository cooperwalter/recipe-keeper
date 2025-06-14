import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRecipeCreation() {
  console.log('Testing recipe creation...\n');
  
  // Sign in as demo user
  console.log('1. Signing in as demo user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo@recipekeeper.com',
    password: 'DemoRecipes2024!'
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('✅ Signed in successfully');
  console.log('User ID:', authData.user?.id);
  console.log('Access token:', authData.session?.access_token ? 'Present' : 'Missing');
  
  // First, let's get the categories to use a valid categoryId
  console.log('\n2. Fetching categories...');
  const categoriesResponse = await fetch('http://localhost:3002/api/categories');
  if (!categoriesResponse.ok) {
    console.error('Failed to fetch categories');
    return;
  }
  
  const categories = await categoriesResponse.json();
  console.log(`Found ${categories.length} categories`);
  
  const dessertCategory = categories.find(c => c.slug === 'dessert');
  console.log('Dessert category ID:', dessertCategory?.id);
  
  // Create a test recipe
  console.log('\n3. Creating test recipe...');
  const recipeData = {
    title: "Grandma's Famous Apple Pie",
    description: "A classic apple pie recipe passed down through generations",
    ingredients: ["6 large apples", "3/4 cup sugar", "2 tablespoons flour", "1 teaspoon cinnamon", "1/4 teaspoon nutmeg", "2 pie crusts"],
    instructions: [
      "Preheat oven to 425°F",
      "Peel and slice apples",
      "Mix sugar, flour, and spices",
      "Toss apples with sugar mixture",
      "Fill pie crust with apple mixture",
      "Cover with top crust and seal edges",
      "Bake for 45-50 minutes until golden"
    ],
    prepTime: 30,
    cookTime: 50,
    servings: 8,
    categoryId: dessertCategory?.id || null,
    tags: ["dessert", "pie", "family-recipe"],
    isPublic: false,
    source: "Grandma Betty",
    notes: "Best served warm with vanilla ice cream"
  };
  
  console.log('Sending recipe data...');
  const response = await fetch('http://localhost:3002/api/recipes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session?.access_token}`
    },
    body: JSON.stringify(recipeData)
  });
  
  const responseText = await response.text();
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    console.error('❌ Failed to create recipe:', responseText);
    return;
  }
  
  const recipe = JSON.parse(responseText);
  console.log('✅ Recipe created successfully!');
  console.log('Recipe ID:', recipe.id);
  console.log('Recipe Title:', recipe.title);
  
  // Verify we can fetch the recipe
  console.log('\n4. Fetching created recipe...');
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
  
  // List all recipes to confirm it appears
  console.log('\n5. Listing all recipes...');
  const listResponse = await fetch('http://localhost:3002/api/recipes?limit=10', {
    headers: {
      'Authorization': `Bearer ${authData.session?.access_token}`
    }
  });
  
  if (!listResponse.ok) {
    console.error('❌ Failed to list recipes');
    return;
  }
  
  const recipeList = await listResponse.json();
  console.log(`✅ Found ${recipeList.recipes.length} recipes total`);
  const ourRecipe = recipeList.recipes.find(r => r.id === recipe.id);
  console.log('Our recipe in list:', ourRecipe ? 'Yes' : 'No');
  
  console.log('\n✅ All tests passed! Recipe creation is working.');
  
  // Sign out
  await supabase.auth.signOut();
}

// Run the test
testRecipeCreation().catch(console.error);