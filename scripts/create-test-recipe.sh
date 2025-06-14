#!/bin/bash

# First, get the auth token by logging in
echo "Logging in as demo user..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@recipekeeper.com",
    "password": "DemoRecipes2024!"
  }')

# For Supabase auth, we need to use the Supabase client
# Let's create a simple Node script instead
cat > /tmp/create-recipe.mjs << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gfbjthimmcioretpexay.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmYmp0aGltbWNpb3JldHBleGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MzgxOTcsImV4cCI6MjA2NTQxNDE5N30.F8ycW6V4uwKLt7fXunsknrU-pH50i4R3iyOdjFpyNWQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createRecipe() {
  // Sign in
  console.log('Signing in...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo@recipekeeper.com',
    password: 'DemoRecipes2024!'
  })
  
  if (authError) {
    console.error('Auth error:', authError)
    return
  }
  
  console.log('Signed in successfully')
  
  // Create recipe
  const recipeData = {
    title: "Grandma's Chocolate Chip Cookies",
    description: "The best chocolate chip cookies you'll ever taste. Crispy on the outside, chewy on the inside.",
    ingredients: ["2 1/4 cups flour", "1 cup butter", "3/4 cup sugar", "2 eggs", "2 cups chocolate chips"],
    instructions: ["Preheat oven to 375°F", "Mix dry ingredients", "Cream butter and sugar", "Add eggs", "Fold in chocolate chips", "Bake for 10-12 minutes"],
    prepTime: 15,
    cookTime: 12,
    servings: 24,
    categoryId: "030216fe-80dc-496a-8e54-4324bfa07ff9", // Dessert category
    tags: ["cookies", "dessert", "family-recipe"],
    isPublic: false,
    source: "Grandma Betty"
  }
  
  const response = await fetch('http://localhost:3002/api/recipes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session?.access_token}`
    },
    body: JSON.stringify(recipeData)
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to create recipe:', response.status, error)
    return
  }
  
  const recipe = await response.json()
  console.log('Recipe created successfully!')
  console.log('Recipe ID:', recipe.id)
  console.log('Title:', recipe.title)
}

createRecipe().then(() => process.exit(0)).catch(console.error)
EOF

node /tmp/create-recipe.mjs