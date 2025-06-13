import { createClient } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDemoAccount() {
  console.log('Creating demo account...');

  // Demo account credentials
  const demoEmail = 'demo@recipekeeper.com';
  const demoPassword = 'DemoRecipes2024!';

  try {
    // Create demo user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo User'
      }
    });

    if (authError) {
      console.error('Error creating demo user:', authError);
      return;
    }

    console.log('Demo user created:', authData.user.email);
    const userId = authData.user.id;

    // Create categories first
    const categories = [
      { name: 'Main Dishes', icon: '🍖' },
      { name: 'Desserts', icon: '🍰' },
      { name: 'Sides', icon: '🥗' },
      { name: 'Breakfast', icon: '🥞' },
      { name: 'Soups', icon: '🍲' }
    ];

    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .insert(categories)
      .select();

    if (categoryError) {
      console.error('Error creating categories:', categoryError);
      return;
    }

    console.log('Categories created');

    // Map category names to IDs
    const categoryMap = categoryData.reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {} as Record<string, string>);

    // Create demo recipes
    const recipes = [
      {
        user_id: userId,
        title: "Grandma's Famous Chocolate Chip Cookies",
        description: "The secret family recipe that started it all. These cookies have been bringing joy to our family for over 50 years.",
        ingredients: [
          "2 1/4 cups all-purpose flour",
          "1 tsp baking soda",
          "1 tsp salt",
          "1 cup butter, softened",
          "3/4 cup granulated sugar",
          "3/4 cup packed brown sugar",
          "2 large eggs",
          "2 tsp vanilla extract",
          "2 cups chocolate chips",
          "1 cup chopped walnuts (optional)"
        ],
        instructions: [
          "Preheat oven to 375°F (190°C).",
          "In a medium bowl, whisk together flour, baking soda, and salt.",
          "In a large mixer bowl, cream together butter and both sugars until fluffy.",
          "Beat in eggs and vanilla until well combined.",
          "Gradually beat in flour mixture.",
          "Stir in chocolate chips and nuts.",
          "Drop rounded tablespoons of dough onto ungreased baking sheets.",
          "Bake for 9-11 minutes or until golden brown.",
          "Cool on baking sheets for 2 minutes before removing to wire racks."
        ],
        prep_time: 15,
        cook_time: 10,
        servings: 48,
        difficulty: 'easy',
        category_id: categoryMap['Desserts'],
        source: "Grandma Rose",
        source_url: null,
        nutrition_info: {
          calories: 110,
          protein: 1,
          carbs: 15,
          fat: 6
        },
        tags: ['holiday', 'classic', 'family-favorite'],
        is_public: true,
        notes: "Grandma always said the secret was to slightly underbake them. They'll continue cooking on the hot pan after you remove them from the oven."
      },
      {
        user_id: userId,
        title: "Mom's Sunday Pot Roast",
        description: "Every Sunday, the house would fill with the amazing aroma of Mom's pot roast. This recipe has been passed down for three generations.",
        ingredients: [
          "3-4 lb beef chuck roast",
          "2 tbsp olive oil",
          "1 onion, quartered",
          "4 carrots, cut into chunks",
          "3 celery stalks, cut into chunks",
          "4 potatoes, quartered",
          "3 cloves garlic, minced",
          "2 cups beef broth",
          "1 cup red wine",
          "2 bay leaves",
          "1 tsp dried thyme",
          "Salt and pepper to taste"
        ],
        instructions: [
          "Season roast generously with salt and pepper.",
          "Heat olive oil in a Dutch oven over medium-high heat.",
          "Sear roast on all sides until browned, about 4-5 minutes per side.",
          "Remove roast and set aside.",
          "Add onions and garlic to the pot, sauté for 2 minutes.",
          "Add wine to deglaze, scraping up browned bits.",
          "Return roast to pot, add broth, bay leaves, and thyme.",
          "Cover and cook in 325°F oven for 2 hours.",
          "Add vegetables around roast, cover and cook 1 more hour.",
          "Let rest 15 minutes before slicing."
        ],
        prep_time: 20,
        cook_time: 180,
        servings: 6,
        difficulty: 'medium',
        category_id: categoryMap['Main Dishes'],
        source: "Mom",
        source_url: null,
        nutrition_info: {
          calories: 420,
          protein: 35,
          carbs: 25,
          fat: 18
        },
        tags: ['sunday-dinner', 'comfort-food', 'family-tradition'],
        is_public: true,
        notes: "Mom always served this with her homemade dinner rolls. The leftovers make amazing sandwiches!"
      },
      {
        user_id: userId,
        title: "Aunt Mary's Apple Pie",
        description: "No family gathering was complete without Aunt Mary's apple pie. She won the county fair with this recipe three years in a row!",
        ingredients: [
          "6-7 tart apples, peeled and sliced",
          "3/4 cup sugar",
          "2 tbsp all-purpose flour",
          "1 tsp cinnamon",
          "1/4 tsp nutmeg",
          "1/8 tsp salt",
          "2 tbsp butter",
          "1 tbsp lemon juice",
          "Double pie crust (store-bought or homemade)",
          "1 egg, beaten (for egg wash)",
          "1 tbsp coarse sugar (for sprinkling)"
        ],
        instructions: [
          "Preheat oven to 425°F (220°C).",
          "In a large bowl, combine apples, sugar, flour, cinnamon, nutmeg, and salt.",
          "Add lemon juice and toss to coat.",
          "Line 9-inch pie pan with bottom crust.",
          "Fill with apple mixture and dot with butter.",
          "Cover with top crust, seal edges, and cut vents.",
          "Brush with egg wash and sprinkle with coarse sugar.",
          "Cover edges with foil to prevent over-browning.",
          "Bake for 25 minutes, then reduce to 350°F and bake 35-40 minutes more.",
          "Cool on wire rack before serving."
        ],
        prep_time: 30,
        cook_time: 65,
        servings: 8,
        difficulty: 'medium',
        category_id: categoryMap['Desserts'],
        source: "Aunt Mary",
        source_url: null,
        nutrition_info: {
          calories: 320,
          protein: 3,
          carbs: 52,
          fat: 12
        },
        tags: ['thanksgiving', 'fall', 'award-winning'],
        is_public: true,
        notes: "Aunt Mary's secret: use a mix of Granny Smith and Honeycrisp apples for the perfect balance of tart and sweet."
      },
      {
        user_id: userId,
        title: "Dad's Famous Chili",
        description: "Dad's chili recipe that he perfected over 20 years. It's been the star of many Super Bowl parties and cookouts.",
        ingredients: [
          "2 lbs ground beef",
          "1 large onion, diced",
          "3 cloves garlic, minced",
          "2 cans (14.5 oz each) diced tomatoes",
          "1 can (6 oz) tomato paste",
          "2 cans (15 oz each) kidney beans, drained",
          "1 can (15 oz) pinto beans, drained",
          "2 tbsp chili powder",
          "1 tbsp cumin",
          "1 tsp oregano",
          "1 tsp paprika",
          "1/2 tsp cayenne pepper",
          "Salt and pepper to taste",
          "2 cups beef broth"
        ],
        instructions: [
          "In a large pot, brown ground beef over medium-high heat.",
          "Add onion and garlic, cook until softened.",
          "Stir in all spices and cook for 1 minute.",
          "Add tomato paste and cook for 2 minutes.",
          "Add diced tomatoes, beans, and broth.",
          "Bring to a boil, then reduce heat and simmer.",
          "Cook uncovered for 2-3 hours, stirring occasionally.",
          "Add water if needed to maintain desired consistency.",
          "Season with salt and pepper to taste.",
          "Serve with cheese, sour cream, and cornbread."
        ],
        prep_time: 15,
        cook_time: 180,
        servings: 8,
        difficulty: 'easy',
        category_id: categoryMap['Soups'],
        source: "Dad",
        source_url: null,
        nutrition_info: {
          calories: 380,
          protein: 28,
          carbs: 35,
          fat: 14
        },
        tags: ['game-day', 'spicy', 'crowd-pleaser'],
        is_public: true,
        notes: "Dad always said the longer it simmers, the better it gets. Sometimes he'd start it in the morning for dinner."
      },
      {
        user_id: userId,
        title: "Nana's Buttermilk Pancakes",
        description: "Saturday mornings meant Nana's fluffy buttermilk pancakes. She'd make stacks and stacks for all the grandkids.",
        ingredients: [
          "2 cups all-purpose flour",
          "2 tbsp sugar",
          "2 tsp baking powder",
          "1 tsp baking soda",
          "1/2 tsp salt",
          "2 cups buttermilk",
          "2 large eggs",
          "1/4 cup melted butter",
          "1 tsp vanilla extract",
          "Butter and maple syrup for serving"
        ],
        instructions: [
          "In a large bowl, whisk together flour, sugar, baking powder, baking soda, and salt.",
          "In another bowl, whisk buttermilk, eggs, melted butter, and vanilla.",
          "Pour wet ingredients into dry ingredients.",
          "Stir just until combined (lumps are okay).",
          "Let batter rest for 5 minutes.",
          "Heat griddle or skillet over medium heat.",
          "Pour 1/4 cup batter for each pancake.",
          "Cook until bubbles form and edges look dry, flip.",
          "Cook until golden brown on both sides.",
          "Serve immediately with butter and warm syrup."
        ],
        prep_time: 10,
        cook_time: 20,
        servings: 4,
        difficulty: 'easy',
        category_id: categoryMap['Breakfast'],
        source: "Nana",
        source_url: null,
        nutrition_info: {
          calories: 280,
          protein: 9,
          carbs: 42,
          fat: 8
        },
        tags: ['weekend', 'breakfast', 'kids-favorite'],
        is_public: true,
        notes: "Nana's trick: don't overmix the batter! A few lumps make fluffier pancakes."
      }
    ];

    // Insert recipes
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert(recipes)
      .select();

    if (recipeError) {
      console.error('Error creating recipes:', recipeError);
      return;
    }

    console.log(`Created ${recipeData.length} demo recipes`);

    // Add some recipe photos (using placeholder URLs)
    const photos = recipeData.map(recipe => ({
      recipe_id: recipe.id,
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(recipe.title)}`,
      caption: `Photo of ${recipe.title}`,
      is_primary: true
    }));

    const { error: photoError } = await supabase
      .from('recipe_photos')
      .insert(photos);

    if (photoError) {
      console.error('Error creating photos:', photoError);
    } else {
      console.log('Added photos to recipes');
    }

    console.log('\n✅ Demo account created successfully!');
    console.log('📧 Email:', demoEmail);
    console.log('🔑 Password:', demoPassword);
    console.log(`📚 Created ${recipeData.length} recipes with photos`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
createDemoAccount();