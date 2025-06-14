-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types (idempotent)
DO $$ BEGIN
    CREATE TYPE recipe_category AS ENUM ('appetizer', 'main_dish', 'side_dish', 'dessert', 'beverage', 'breakfast', 'lunch', 'dinner', 'snack', 'sauce', 'soup', 'salad', 'bread', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  servings INTEGER DEFAULT 4,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_public BOOLEAN DEFAULT false,
  source_name TEXT, -- who contributed the recipe
  source_notes TEXT, -- family notes & memories
  version INTEGER DEFAULT 1,
  parent_recipe_id UUID REFERENCES recipes(id) -- for versioning
);

-- Create categories table (simpler than using enums)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default categories (idempotent)
INSERT INTO categories (name, icon) VALUES
  ('Main Dishes', '🍖'),
  ('Desserts', '🍰'),
  ('Sides', '🥗'),
  ('Breakfast', '🥞'),
  ('Soups', '🍲'),
  ('Appetizers', '🥟'),
  ('Beverages', '🥤'),
  ('Salads', '🥙'),
  ('Breads', '🍞'),
  ('Sauces', '🥫')
ON CONFLICT (name) DO NOTHING;

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient TEXT NOT NULL,
  amount DECIMAL(10,2),
  unit TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create instructions table
CREATE TABLE IF NOT EXISTS instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(recipe_id, step_number)
);

-- Create recipe_photos table
CREATE TABLE IF NOT EXISTS recipe_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create recipe_categories table (junction table)
CREATE TABLE IF NOT EXISTS recipe_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(recipe_id, category_id)
);

-- Create recipe_tags table
CREATE TABLE IF NOT EXISTS recipe_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(recipe_id, tag)
);

-- Create recipe_versions table for tracking changes
CREATE TABLE IF NOT EXISTS recipe_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  recipe_data JSONB NOT NULL, -- stores snapshot of recipe at this version
  UNIQUE(recipe_id, version_number)
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(recipe_id, user_id)
);

-- Create indexes for better query performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_instructions_recipe_id ON instructions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_photos_recipe_id ON recipe_photos(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_recipe_id ON recipe_categories(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_category_id ON recipe_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag ON recipe_tags(tag);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_recipe_id ON favorites(recipe_id);

-- Create function to update updated_at timestamp (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (idempotent)
DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipe_photos_updated_at ON recipe_photos;
CREATE TRIGGER update_recipe_photos_updated_at BEFORE UPDATE ON recipe_photos
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create function to create version on recipe update (idempotent)
CREATE OR REPLACE FUNCTION create_recipe_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if significant fields changed
  IF OLD.title != NEW.title OR 
     OLD.description IS DISTINCT FROM NEW.description OR
     OLD.prep_time IS DISTINCT FROM NEW.prep_time OR
     OLD.cook_time IS DISTINCT FROM NEW.cook_time OR
     OLD.servings IS DISTINCT FROM NEW.servings OR
     OLD.source_notes IS DISTINCT FROM NEW.source_notes THEN
    
    -- Increment version number
    NEW.version = OLD.version + 1;
    
    -- Insert version record
    INSERT INTO recipe_versions (recipe_id, version_number, changed_by, recipe_data)
    VALUES (
      NEW.id,
      NEW.version,
      NEW.created_by, -- Note: In real app, this should be the current user
      jsonb_build_object(
        'title', NEW.title,
        'description', NEW.description,
        'prep_time', NEW.prep_time,
        'cook_time', NEW.cook_time,
        'servings', NEW.servings,
        'source_name', NEW.source_name,
        'source_notes', NEW.source_notes
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for versioning (idempotent)
DROP TRIGGER IF EXISTS create_recipe_version_trigger ON recipes;
CREATE TRIGGER create_recipe_version_trigger BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE PROCEDURE create_recipe_version();