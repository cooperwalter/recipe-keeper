-- Seed Demo Recipes for Recipe Keeper
-- 
-- IMPORTANT: Before running this:
-- 1. Create the demo account at http://localhost:3002/auth/sign-up
--    Email: demo@recipekeeper.com
--    Password: DemoRecipes2024!
-- 2. Get the user ID from auth.users table
-- 3. Replace 'YOUR_DEMO_USER_ID' below with the actual user ID

-- Set the demo user ID (you need to replace this!)
DO $$
DECLARE
    demo_user_id UUID;
    main_dishes_id UUID;
    desserts_id UUID;
    sides_id UUID;
    breakfast_id UUID;
    soups_id UUID;
    recipe_id UUID;
BEGIN
    -- IMPORTANT: Replace this with your actual demo user ID from auth.users
    -- You can find it by running: SELECT id FROM auth.users WHERE email = 'demo@recipekeeper.com';
    -- demo_user_id := 'YOUR_DEMO_USER_ID'::UUID;
    
    -- Alternatively, try to find the demo user (this might not work due to RLS)
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@recipekeeper.com';
    
    IF demo_user_id IS NULL OR demo_user_id::TEXT = 'YOUR_DEMO_USER_ID' THEN
        RAISE EXCEPTION 'Please replace YOUR_DEMO_USER_ID with the actual user ID from auth.users table';
    END IF;

    -- Get category IDs
    SELECT id INTO main_dishes_id FROM categories WHERE name = 'Main Dishes';
    SELECT id INTO desserts_id FROM categories WHERE name = 'Desserts';
    SELECT id INTO sides_id FROM categories WHERE name = 'Sides';
    SELECT id INTO breakfast_id FROM categories WHERE name = 'Breakfast';
    SELECT id INTO soups_id FROM categories WHERE name = 'Soups';

    -- Recipe 1: Grandma's Chocolate Chip Cookies
    INSERT INTO recipes (
        user_id, title, description, ingredients, instructions, 
        prep_time, cook_time, servings, difficulty, category_id, 
        source, tags, is_public, notes
    ) VALUES (
        demo_user_id,
        'Grandma''s Famous Chocolate Chip Cookies',
        'The secret family recipe that started it all. These cookies have been bringing joy to our family for over 50 years.',
        ARRAY[
            '2 1/4 cups all-purpose flour',
            '1 tsp baking soda',
            '1 tsp salt',
            '1 cup butter, softened',
            '3/4 cup granulated sugar',
            '3/4 cup packed brown sugar',
            '2 large eggs',
            '2 tsp vanilla extract',
            '2 cups chocolate chips',
            '1 cup chopped walnuts (optional)'
        ],
        ARRAY[
            'Preheat oven to 375°F (190°C).',
            'In a medium bowl, whisk together flour, baking soda, and salt.',
            'In a large mixer bowl, cream together butter and both sugars until fluffy.',
            'Beat in eggs and vanilla until well combined.',
            'Gradually beat in flour mixture.',
            'Stir in chocolate chips and nuts.',
            'Drop rounded tablespoons of dough onto ungreased baking sheets.',
            'Bake for 9-11 minutes or until golden brown.',
            'Cool on baking sheets for 2 minutes before removing to wire racks.'
        ],
        15, 10, 48, 'easy', desserts_id,
        'Grandma Rose',
        ARRAY['holiday', 'classic', 'family-favorite', 'cookies'],
        true,
        'Grandma always said the secret was to slightly underbake them. They''ll continue cooking on the hot pan after you remove them from the oven.'
    ) RETURNING id INTO recipe_id;
    
    -- Add photo for cookies
    INSERT INTO recipe_photos (recipe_id, url, caption, is_primary)
    VALUES (recipe_id, 'https://source.unsplash.com/800x600/?chocolate,chip,cookies', 'Grandma''s Famous Chocolate Chip Cookies', true);
    
    -- Add to favorites
    INSERT INTO favorites (recipe_id, user_id) VALUES (recipe_id, demo_user_id);

    -- Recipe 2: Mom's Sunday Pot Roast
    INSERT INTO recipes (
        user_id, title, description, ingredients, instructions, 
        prep_time, cook_time, servings, difficulty, category_id, 
        source, tags, is_public, notes
    ) VALUES (
        demo_user_id,
        'Mom''s Sunday Pot Roast',
        'Every Sunday, the house would fill with the amazing aroma of Mom''s pot roast. This recipe has been passed down for three generations.',
        ARRAY[
            '3-4 lb beef chuck roast',
            '2 tbsp olive oil',
            '1 onion, quartered',
            '4 carrots, cut into chunks',
            '3 celery stalks, cut into chunks',
            '4 potatoes, quartered',
            '3 cloves garlic, minced',
            '2 cups beef broth',
            '1 cup red wine',
            '2 bay leaves',
            '1 tsp dried thyme',
            'Salt and pepper to taste'
        ],
        ARRAY[
            'Season roast generously with salt and pepper.',
            'Heat olive oil in a Dutch oven over medium-high heat.',
            'Sear roast on all sides until browned, about 4-5 minutes per side.',
            'Remove roast and set aside.',
            'Add onions and garlic to the pot, sauté for 2 minutes.',
            'Add wine to deglaze, scraping up browned bits.',
            'Return roast to pot, add broth, bay leaves, and thyme.',
            'Cover and cook in 325°F oven for 2 hours.',
            'Add vegetables around roast, cover and cook 1 more hour.',
            'Let rest 15 minutes before slicing.'
        ],
        20, 180, 6, 'medium', main_dishes_id,
        'Mom',
        ARRAY['sunday-dinner', 'comfort-food', 'family-tradition', 'beef'],
        true,
        'Mom always served this with her homemade dinner rolls. The leftovers make amazing sandwiches!'
    ) RETURNING id INTO recipe_id;
    
    -- Add photo for pot roast
    INSERT INTO recipe_photos (recipe_id, url, caption, is_primary)
    VALUES (recipe_id, 'https://source.unsplash.com/800x600/?pot,roast,beef', 'Mom''s Sunday Pot Roast', true);
    
    -- Add to favorites
    INSERT INTO favorites (recipe_id, user_id) VALUES (recipe_id, demo_user_id);

    -- Recipe 3: Aunt Mary's Apple Pie
    INSERT INTO recipes (
        user_id, title, description, ingredients, instructions, 
        prep_time, cook_time, servings, difficulty, category_id, 
        source, tags, is_public, notes
    ) VALUES (
        demo_user_id,
        'Aunt Mary''s Apple Pie',
        'No family gathering was complete without Aunt Mary''s apple pie. She won the county fair with this recipe three years in a row!',
        ARRAY[
            '6-7 tart apples, peeled and sliced',
            '3/4 cup sugar',
            '2 tbsp all-purpose flour',
            '1 tsp cinnamon',
            '1/4 tsp nutmeg',
            '1/8 tsp salt',
            '2 tbsp butter',
            '1 tbsp lemon juice',
            'Double pie crust (store-bought or homemade)',
            '1 egg, beaten (for egg wash)',
            '1 tbsp coarse sugar (for sprinkling)'
        ],
        ARRAY[
            'Preheat oven to 425°F (220°C).',
            'In a large bowl, combine apples, sugar, flour, cinnamon, nutmeg, and salt.',
            'Add lemon juice and toss to coat.',
            'Line 9-inch pie pan with bottom crust.',
            'Fill with apple mixture and dot with butter.',
            'Cover with top crust, seal edges, and cut vents.',
            'Brush with egg wash and sprinkle with coarse sugar.',
            'Cover edges with foil to prevent over-browning.',
            'Bake for 25 minutes, then reduce to 350°F and bake 35-40 minutes more.',
            'Cool on wire rack before serving.'
        ],
        30, 65, 8, 'medium', desserts_id,
        'Aunt Mary',
        ARRAY['thanksgiving', 'fall', 'award-winning', 'pie'],
        true,
        'Aunt Mary''s secret: use a mix of Granny Smith and Honeycrisp apples for the perfect balance of tart and sweet.'
    ) RETURNING id INTO recipe_id;
    
    -- Add photo for apple pie
    INSERT INTO recipe_photos (recipe_id, url, caption, is_primary)
    VALUES (recipe_id, 'https://source.unsplash.com/800x600/?apple,pie', 'Aunt Mary''s Apple Pie', true);

    -- Recipe 4: Dad's Famous Chili
    INSERT INTO recipes (
        user_id, title, description, ingredients, instructions, 
        prep_time, cook_time, servings, difficulty, category_id, 
        source, tags, is_public, notes
    ) VALUES (
        demo_user_id,
        'Dad''s Famous Chili',
        'Dad''s chili recipe that he perfected over 20 years. It''s been the star of many Super Bowl parties and cookouts.',
        ARRAY[
            '2 lbs ground beef',
            '1 large onion, diced',
            '3 cloves garlic, minced',
            '2 cans (14.5 oz each) diced tomatoes',
            '1 can (6 oz) tomato paste',
            '2 cans (15 oz each) kidney beans, drained',
            '1 can (15 oz) pinto beans, drained',
            '2 tbsp chili powder',
            '1 tbsp cumin',
            '1 tsp oregano',
            '1 tsp paprika',
            '1/2 tsp cayenne pepper',
            'Salt and pepper to taste',
            '2 cups beef broth'
        ],
        ARRAY[
            'In a large pot, brown ground beef over medium-high heat.',
            'Add onion and garlic, cook until softened.',
            'Stir in all spices and cook for 1 minute.',
            'Add tomato paste and cook for 2 minutes.',
            'Add diced tomatoes, beans, and broth.',
            'Bring to a boil, then reduce heat and simmer.',
            'Cook uncovered for 2-3 hours, stirring occasionally.',
            'Add water if needed to maintain desired consistency.',
            'Season with salt and pepper to taste.',
            'Serve with cheese, sour cream, and cornbread.'
        ],
        15, 180, 8, 'easy', soups_id,
        'Dad',
        ARRAY['game-day', 'spicy', 'crowd-pleaser', 'chili'],
        true,
        'Dad always said the longer it simmers, the better it gets. Sometimes he''d start it in the morning for dinner.'
    ) RETURNING id INTO recipe_id;
    
    -- Add photo for chili
    INSERT INTO recipe_photos (recipe_id, url, caption, is_primary)
    VALUES (recipe_id, 'https://source.unsplash.com/800x600/?chili,bowl', 'Dad''s Famous Chili', true);

    -- Recipe 5: Nana's Buttermilk Pancakes
    INSERT INTO recipes (
        user_id, title, description, ingredients, instructions, 
        prep_time, cook_time, servings, difficulty, category_id, 
        source, tags, is_public, notes
    ) VALUES (
        demo_user_id,
        'Nana''s Buttermilk Pancakes',
        'Saturday mornings meant Nana''s fluffy buttermilk pancakes. She''d make stacks and stacks for all the grandkids.',
        ARRAY[
            '2 cups all-purpose flour',
            '2 tbsp sugar',
            '2 tsp baking powder',
            '1 tsp baking soda',
            '1/2 tsp salt',
            '2 cups buttermilk',
            '2 large eggs',
            '1/4 cup melted butter',
            '1 tsp vanilla extract',
            'Butter and maple syrup for serving'
        ],
        ARRAY[
            'In a large bowl, whisk together flour, sugar, baking powder, baking soda, and salt.',
            'In another bowl, whisk buttermilk, eggs, melted butter, and vanilla.',
            'Pour wet ingredients into dry ingredients.',
            'Stir just until combined (lumps are okay).',
            'Let batter rest for 5 minutes.',
            'Heat griddle or skillet over medium heat.',
            'Pour 1/4 cup batter for each pancake.',
            'Cook until bubbles form and edges look dry, flip.',
            'Cook until golden brown on both sides.',
            'Serve immediately with butter and warm syrup.'
        ],
        10, 20, 4, 'easy', breakfast_id,
        'Nana',
        ARRAY['weekend', 'breakfast', 'kids-favorite', 'pancakes'],
        true,
        'Nana''s trick: don''t overmix the batter! A few lumps make fluffier pancakes.'
    ) RETURNING id INTO recipe_id;
    
    -- Add photo for pancakes
    INSERT INTO recipe_photos (recipe_id, url, caption, is_primary)
    VALUES (recipe_id, 'https://source.unsplash.com/800x600/?pancakes,breakfast', 'Nana''s Buttermilk Pancakes', true);

    RAISE NOTICE 'Demo recipes seeded successfully!';
    RAISE NOTICE 'Demo account has 5 recipes with photos and 2 favorites.';
END $$;