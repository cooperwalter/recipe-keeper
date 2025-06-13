-- Seed data for development and testing

-- Insert test users (these would be created via Supabase Auth in real scenarios)
-- Note: You'll need to create these users via Supabase Auth dashboard or API

-- Insert sample recipes (you'll need to replace user IDs with actual auth user IDs)
INSERT INTO recipes (title, description, prep_time, cook_time, servings, created_by, is_public, source_name, source_notes) VALUES
  ('Grandma''s Chocolate Chip Cookies', 'The best chocolate chip cookies passed down through generations', 15, 12, 24, auth.uid(), true, 'Grandma Rose', 'She always made these for us when we visited. The secret is the extra vanilla!'),
  ('Sunday Pot Roast', 'A hearty pot roast perfect for family dinners', 30, 180, 6, auth.uid(), true, 'Mom', 'This was our traditional Sunday dinner growing up'),
  ('Quick Pasta Marinara', 'Simple and delicious weeknight pasta', 5, 20, 4, auth.uid(), false, 'Self', 'My go-to recipe when I need something fast');

-- Get recipe IDs for relationships (in real app, these would be returned from inserts)
WITH recipe_ids AS (
  SELECT id, title FROM recipes WHERE created_by = auth.uid()
)

-- Insert ingredients for Chocolate Chip Cookies
INSERT INTO ingredients (recipe_id, ingredient, amount, unit, order_index) 
SELECT id, ingredient, amount, unit, order_index
FROM recipe_ids, 
LATERAL (VALUES 
  ('All-purpose flour', 2.25, 'cups', 1),
  ('Baking soda', 1, 'tsp', 2),
  ('Salt', 1, 'tsp', 3),
  ('Butter (softened)', 1, 'cup', 4),
  ('Granulated sugar', 0.75, 'cup', 5),
  ('Brown sugar (packed)', 0.75, 'cup', 6),
  ('Eggs', 2, NULL, 7),
  ('Vanilla extract', 2, 'tsp', 8),
  ('Chocolate chips', 2, 'cups', 9)
) AS t(ingredient, amount, unit, order_index)
WHERE title = 'Grandma''s Chocolate Chip Cookies';

-- Insert instructions for Chocolate Chip Cookies
INSERT INTO instructions (recipe_id, step_number, instruction)
SELECT id, step_number, instruction
FROM recipe_ids,
LATERAL (VALUES
  (1, 'Preheat oven to 375°F (190°C)'),
  (2, 'In a medium bowl, whisk together flour, baking soda, and salt'),
  (3, 'In a large bowl, cream together butter and both sugars until fluffy'),
  (4, 'Beat in eggs one at a time, then stir in vanilla'),
  (5, 'Gradually blend in the flour mixture'),
  (6, 'Fold in chocolate chips'),
  (7, 'Drop rounded tablespoons onto ungreased cookie sheets'),
  (8, 'Bake for 9-11 minutes or until golden brown'),
  (9, 'Cool on baking sheet for 2 minutes before removing to wire rack')
) AS t(step_number, instruction)
WHERE title = 'Grandma''s Chocolate Chip Cookies';

-- Insert ingredients for Pot Roast
INSERT INTO ingredients (recipe_id, ingredient, amount, unit, order_index) 
SELECT id, ingredient, amount, unit, order_index
FROM recipe_ids, 
LATERAL (VALUES 
  ('Beef chuck roast', 3, 'lbs', 1),
  ('Olive oil', 2, 'tbsp', 2),
  ('Onions (quartered)', 2, NULL, 3),
  ('Carrots (chunked)', 4, NULL, 4),
  ('Potatoes (quartered)', 4, NULL, 5),
  ('Beef broth', 2, 'cups', 6),
  ('Tomato paste', 2, 'tbsp', 7),
  ('Worcestershire sauce', 1, 'tbsp', 8),
  ('Thyme', 1, 'tsp', 9),
  ('Bay leaves', 2, NULL, 10),
  ('Salt and pepper', NULL, 'to taste', 11)
) AS t(ingredient, amount, unit, order_index)
WHERE title = 'Sunday Pot Roast';

-- Insert instructions for Pot Roast
INSERT INTO instructions (recipe_id, step_number, instruction)
SELECT id, step_number, instruction
FROM recipe_ids,
LATERAL (VALUES
  (1, 'Preheat oven to 325°F (165°C)'),
  (2, 'Season roast generously with salt and pepper'),
  (3, 'Heat oil in Dutch oven over medium-high heat'),
  (4, 'Sear roast on all sides until browned, about 4 minutes per side'),
  (5, 'Remove roast and set aside'),
  (6, 'Add onions to pot and cook until softened'),
  (7, 'Stir in tomato paste and cook for 1 minute'),
  (8, 'Add broth, Worcestershire, thyme, and bay leaves'),
  (9, 'Return roast to pot and add carrots and potatoes'),
  (10, 'Cover and cook in oven for 3 hours until meat is tender'),
  (11, 'Remove bay leaves before serving')
) AS t(step_number, instruction)
WHERE title = 'Sunday Pot Roast';

-- Insert category mappings
INSERT INTO recipe_category_mappings (recipe_id, category_id)
SELECT r.id, c.id
FROM recipes r, recipe_categories c
WHERE r.title = 'Grandma''s Chocolate Chip Cookies' AND c.slug = 'dessert'
UNION
SELECT r.id, c.id
FROM recipes r, recipe_categories c
WHERE r.title = 'Sunday Pot Roast' AND c.slug = 'main-dish'
UNION
SELECT r.id, c.id
FROM recipes r, recipe_categories c
WHERE r.title = 'Quick Pasta Marinara' AND c.slug = 'main-dish';

-- Insert tags
INSERT INTO recipe_tags (recipe_id, tag)
SELECT id, tag
FROM recipe_ids,
LATERAL (VALUES
  ('Grandma''s Chocolate Chip Cookies', 'family-recipe'),
  ('Grandma''s Chocolate Chip Cookies', 'cookies'),
  ('Grandma''s Chocolate Chip Cookies', 'dessert'),
  ('Grandma''s Chocolate Chip Cookies', 'baking'),
  ('Sunday Pot Roast', 'family-recipe'),
  ('Sunday Pot Roast', 'comfort-food'),
  ('Sunday Pot Roast', 'slow-cooked'),
  ('Sunday Pot Roast', 'sunday-dinner'),
  ('Quick Pasta Marinara', 'quick'),
  ('Quick Pasta Marinara', 'easy'),
  ('Quick Pasta Marinara', 'weeknight'),
  ('Quick Pasta Marinara', 'pasta')
) AS t(title, tag)
WHERE recipe_ids.title = t.title;

-- Add some recipes to favorites
INSERT INTO favorites (recipe_id, user_id)
SELECT id, auth.uid()
FROM recipes
WHERE title IN ('Grandma''s Chocolate Chip Cookies', 'Sunday Pot Roast')
AND created_by = auth.uid();