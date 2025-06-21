-- Recipe and Me Database Setup (Fixed Version)
-- Run this file in Supabase SQL Editor to set up your database
-- All operations are idempotent (safe to run multiple times)

-- ================================================
-- INITIAL SCHEMA (idempotent version)
-- ================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they have wrong structure (be careful with this in production!)
-- Uncomment these lines ONLY if you need to reset the database
-- DROP TABLE IF EXISTS favorites CASCADE;
-- DROP TABLE IF EXISTS recipe_photos CASCADE;
-- DROP TABLE IF EXISTS recipes CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;

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

-- Create recipes table with correct column names
DO $$ 
BEGIN
  -- Check if recipes table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
    -- Create new table
    CREATE TABLE recipes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      ingredients TEXT[] NOT NULL DEFAULT '{}',
      instructions TEXT[] NOT NULL DEFAULT '{}',
      prep_time INTEGER,
      cook_time INTEGER,
      servings INTEGER DEFAULT 4,
      difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
      category_id UUID REFERENCES categories(id),
      source TEXT,
      source_url TEXT,
      nutrition_info JSONB,
      tags TEXT[] DEFAULT '{}',
      is_public BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  ELSE
    -- Table exists, check if it has user_id column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'recipes' 
                   AND column_name = 'user_id') THEN
      -- Check for created_by column instead
      IF EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recipes' 
                 AND column_name = 'created_by') THEN
        -- Rename created_by to user_id
        ALTER TABLE recipes RENAME COLUMN created_by TO user_id;
      ELSE
        -- Add user_id column if neither exists
        ALTER TABLE recipes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL;
      END IF;
    END IF;
    
    -- Add other columns if they don't exist
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard'));
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_info JSONB;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

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

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(recipe_id, user_id)
);

-- Create indexes for better query performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipes_category_id ON recipes(category_id);
CREATE INDEX IF NOT EXISTS idx_recipe_photos_recipe_id ON recipe_photos(recipe_id);
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

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- Recipes policies (using user_id)
DROP POLICY IF EXISTS "Users can view their own recipes" ON recipes;
CREATE POLICY "Users can view their own recipes" ON recipes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view public recipes" ON recipes;
CREATE POLICY "Users can view public recipes" ON recipes
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can create their own recipes" ON recipes;
CREATE POLICY "Users can create their own recipes" ON recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recipes" ON recipes;
CREATE POLICY "Users can update their own recipes" ON recipes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recipes" ON recipes;
CREATE POLICY "Users can delete their own recipes" ON recipes
  FOR DELETE USING (auth.uid() = user_id);

-- Recipe photos policies
DROP POLICY IF EXISTS "Users can view photos of accessible recipes" ON recipe_photos;
CREATE POLICY "Users can view photos of accessible recipes" ON recipe_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_photos.recipe_id 
      AND (recipes.user_id = auth.uid() OR recipes.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Users can add photos to their own recipes" ON recipe_photos;
CREATE POLICY "Users can add photos to their own recipes" ON recipe_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_photos.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update photos of their own recipes" ON recipe_photos;
CREATE POLICY "Users can update photos of their own recipes" ON recipe_photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_photos.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete photos of their own recipes" ON recipe_photos;
CREATE POLICY "Users can delete photos of their own recipes" ON recipe_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_photos.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

-- Favorites policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add their own favorites" ON favorites;
CREATE POLICY "Users can add their own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own favorites" ON favorites;
CREATE POLICY "Users can remove their own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- STORAGE BUCKETS
-- ================================================

-- Create storage bucket for recipe photos (if using Supabase Storage)
-- Note: This needs to be done via Supabase Dashboard or API
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('recipe-photos', 'recipe-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- ================================================
-- MIGRATION TRACKING
-- ================================================

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT
);

-- Record this migration
INSERT INTO schema_migrations (version, checksum) 
VALUES ('20250613_initial_setup_fixed', 'fixed_user_id_column')
ON CONFLICT (version) DO NOTHING;

-- ================================================
-- VERIFICATION
-- ================================================

-- Check if everything was created successfully
DO $$
BEGIN
  -- Check tables
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
    RAISE NOTICE '✓ categories table exists';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
    RAISE NOTICE '✓ recipes table exists';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipe_photos') THEN
    RAISE NOTICE '✓ recipe_photos table exists';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'favorites') THEN
    RAISE NOTICE '✓ favorites table exists';
  END IF;
  
  -- Check if recipes has user_id column
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'recipes' 
             AND column_name = 'user_id') THEN
    RAISE NOTICE '✓ recipes.user_id column exists';
  END IF;
END $$;

-- ================================================
-- DONE!
-- ================================================
-- Your database is now set up for Recipe and Me
-- This script handles both new installations and fixes existing ones