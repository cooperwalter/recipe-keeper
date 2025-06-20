-- Add badges column to recipes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'recipes' 
    AND column_name = 'badges'
  ) THEN
    ALTER TABLE recipes ADD COLUMN badges text[];
    CREATE INDEX idx_recipes_badges ON recipes USING GIN (badges);
  END IF;
END $$;