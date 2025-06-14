import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables before importing any other modules
config({ path: join(process.cwd(), '.env.local') });

import { db, recipes, ingredients, instructions, recipeCategoryMappings, recipeTags } from '@/lib/db';

async function testDirectRecipeCreation() {
  console.log('Testing direct database recipe creation...\n');
  
  try {
    // Create a recipe directly
    console.log('1. Creating recipe...');
    const [recipe] = await db
      .insert(recipes)
      .values({
        title: "Grandma's Apple Pie - Test",
        description: "A delicious apple pie recipe for testing",
        prepTime: 30,
        cookTime: 45,
        servings: 8,
        difficulty: 'medium',
        isPublic: false,
        createdBy: 'eff26321-5163-4fb5-a49d-d8cf4cf74337', // Demo user ID
        source: 'Test Script',
        notes: 'This is a test recipe created via script'
      })
      .returning();
    
    console.log('✅ Recipe created:', recipe.id);
    console.log('   Title:', recipe.title);
    
    // Add ingredients
    console.log('\n2. Adding ingredients...');
    const ingredientsList = [
      '6 large apples, peeled and sliced',
      '3/4 cup granulated sugar',
      '2 tablespoons all-purpose flour',
      '1 teaspoon ground cinnamon',
      '1/4 teaspoon ground nutmeg',
      '2 pie crusts (store-bought or homemade)',
      '2 tablespoons butter, cut into small pieces'
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
      'Preheat oven to 425°F (220°C)',
      'Peel and slice apples into thin, even slices',
      'In a large bowl, mix sugar, flour, cinnamon, and nutmeg',
      'Add apple slices to the bowl and toss to coat evenly',
      'Roll out bottom pie crust and place in a 9-inch pie pan',
      'Pour apple mixture into the crust and dot with butter pieces',
      'Cover with top crust, seal edges, and cut vents in the top',
      'Bake for 45-50 minutes until crust is golden brown',
      'Cool on a wire rack for at least 30 minutes before serving'
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
    const tags = ['pie', 'dessert', 'baking', 'family-recipe', 'apples'];
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