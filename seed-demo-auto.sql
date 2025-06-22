-- Automated Demo Recipe Seeder
-- This version attempts to find the demo user automatically
-- Run this after creating demo@recipeandme.app account

DO $$
DECLARE
    demo_user_id UUID;
    main_dishes_id UUID;
    desserts_id UUID;
    breakfast_id UUID;
    soups_id UUID;
    recipe_id UUID;
    demo_email TEXT := 'demo@recipeandme.app';
BEGIN
    -- Try to find demo user in auth.users
    -- Note: This might fail due to RLS policies
    BEGIN
        SELECT id INTO demo_user_id 
        FROM auth.users 
        WHERE email = demo_email
        LIMIT 1;
        
        IF demo_user_id IS NULL THEN
            RAISE EXCEPTION 'Demo user not found. Please create account first with email: %', demo_email;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If we can't access auth.users, try to find by recipes
            SELECT DISTINCT user_id INTO demo_user_id
            FROM recipes
            WHERE source = 'Demo Account'
            LIMIT 1;
            
            IF demo_user_id IS NULL THEN
                RAISE EXCEPTION 'Cannot find demo user. Please run seed-demo-recipes.sql with manual user ID';
            END IF;
    END;

    -- Get category IDs
    SELECT id INTO main_dishes_id FROM categories WHERE name = 'Main Dishes';
    SELECT id INTO desserts_id FROM categories WHERE name = 'Desserts';
    SELECT id INTO breakfast_id FROM categories WHERE name = 'Breakfast';
    SELECT id INTO soups_id FROM categories WHERE name = 'Soups';

    -- Quick insert of demo recipes
    INSERT INTO recipes (user_id, title, description, ingredients, instructions, prep_time, cook_time, servings, difficulty, category_id, source, tags, is_public, notes)
    VALUES 
    (
        demo_user_id,
        'Quick Demo: Chocolate Chip Cookies',
        'A classic family recipe perfect for demo purposes.',
        ARRAY['2 cups flour', '1 cup butter', '1 cup sugar', '1 cup brown sugar', '2 eggs', '2 cups chocolate chips'],
        ARRAY['Mix ingredients', 'Drop on baking sheet', 'Bake at 375°F for 10 minutes'],
        15, 10, 24, 'easy', desserts_id,
        'Demo Account',
        ARRAY['demo', 'cookies', 'dessert'],
        true,
        'This is a demo recipe to showcase the app features.'
    ),
    (
        demo_user_id,
        'Quick Demo: Spaghetti Bolognese',
        'A hearty Italian classic for demonstration.',
        ARRAY['1 lb ground beef', '1 onion', '2 cloves garlic', '1 can tomatoes', '1 lb spaghetti', 'Italian herbs'],
        ARRAY['Brown meat', 'Add vegetables', 'Simmer sauce', 'Cook pasta', 'Combine and serve'],
        20, 30, 4, 'medium', main_dishes_id,
        'Demo Account',
        ARRAY['demo', 'pasta', 'italian'],
        true,
        'Perfect for showing how recipes display in the app.'
    ),
    (
        demo_user_id,
        'Quick Demo: Pancakes',
        'Fluffy pancakes for a demo breakfast.',
        ARRAY['2 cups flour', '2 eggs', '2 cups milk', '2 tbsp sugar', '1 tsp baking powder'],
        ARRAY['Mix dry ingredients', 'Add wet ingredients', 'Cook on griddle', 'Serve with syrup'],
        10, 15, 4, 'easy', breakfast_id,
        'Demo Account',
        ARRAY['demo', 'breakfast', 'quick'],
        true,
        'Simple recipe to demonstrate the breakfast category.'
    );

    -- Add some photos
    INSERT INTO recipe_photos (recipe_id, url, caption, is_primary)
    SELECT 
        id,
        'https://source.unsplash.com/800x600/?' || LOWER(REPLACE(SUBSTRING(title FROM 'Demo: (.*)'), ' ', ',')),
        title,
        true
    FROM recipes 
    WHERE user_id = demo_user_id 
    AND source = 'Demo Account';

    -- Add favorites
    INSERT INTO favorites (recipe_id, user_id)
    SELECT id, user_id
    FROM recipes
    WHERE user_id = demo_user_id
    AND title LIKE '%Cookies%'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Demo recipes created successfully!';
    RAISE NOTICE 'User ID: %', demo_user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE NOTICE 'Please ensure demo@recipeandme.app account exists';
END $$;