import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables before importing any other modules
config({ path: join(__dirname, '..', '.env.local') });

// Now import the database modules
import { db, recipes, ingredients, instructions, recipeCategoryMappings, recipeTags } from '../lib/db/index.js';

async function testDirectRecipeCreation() {
  console.log('Testing direct database recipe creation...\n');
  
  try {
    // Create a recipe directly
    console.log('1. Creating recipe...');
    const [recipe] = await db
      .insert(recipes)
      .values({
        title: "Test Recipe - Direct DB",
        description: "Testing direct database insertion",
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        difficulty: 'easy',
        isPublic: false,
        createdBy: 'eff26321-5163-4fb5-a49d-d8cf4cf74337', // Demo user ID
        source: 'Test Script'
      })
      .returning();
    
    console.log('✅ Recipe created:', recipe.id);
    console.log('   Title:', recipe.title);
    
    // Add ingredients
    console.log('\n2. Adding ingredients...');
    const ingredientsList = [
      '2 cups flour',
      '1 cup sugar',
      '3 eggs',
      '1 tsp vanilla'
    ];
    
    const ingredientRecords = ingredientsList.map((ingredient, index) => ({
      recipeId: recipe.id,
      ingredient,
      orderIndex: index
    }));
    
    await db.insert(ingredients).values(ingredientRecords);
    console.log('✅ Added', ingredientsList.length, 'ingredients');
    
    // Add instructions
    console.log('\n3. Adding instructions...');
    const instructionsList = [
      'Preheat oven to 350°F',
      'Mix dry ingredients',
      'Beat eggs and sugar',
      'Combine all ingredients',
      'Bake for 25 minutes'
    ];
    
    const instructionRecords = instructionsList.map((instruction, index) => ({
      recipeId: recipe.id,
      instruction,
      stepNumber: index + 1
    }));
    
    await db.insert(instructions).values(instructionRecords);
    console.log('✅ Added', instructionsList.length, 'instructions');
    
    // Add category (dessert)
    console.log('\n4. Adding category...');
    await db.insert(recipeCategoryMappings).values({
      recipeId: recipe.id,
      categoryId: '030216fe-80dc-496a-8e54-4324bfa07ff9' // Dessert
    });
    console.log('✅ Added dessert category');
    
    // Add tags
    console.log('\n5. Adding tags...');
    const tags = ['test', 'dessert', 'baking'];
    const tagRecords = tags.map(tag => ({
      recipeId: recipe.id,
      tag
    }));
    
    await db.insert(recipeTags).values(tagRecords);
    console.log('✅ Added', tags.length, 'tags');
    
    console.log('\n✅ Recipe creation complete!');
    console.log('Recipe ID:', recipe.id);
    console.log('View at: http://localhost:3002/protected/recipes/' + recipe.id);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testDirectRecipeCreation();