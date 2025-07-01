-- Add ingredient_adjustments column to recipes table
ALTER TABLE "recipes" ADD COLUMN "ingredient_adjustments" jsonb;