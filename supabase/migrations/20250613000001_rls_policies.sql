-- Enable Row Level Security on all tables
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Recipes policies
CREATE POLICY "Users can view their own recipes" 
  ON recipes FOR SELECT 
  USING (auth.uid() = created_by OR is_public = true);

CREATE POLICY "Users can create their own recipes" 
  ON recipes FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own recipes" 
  ON recipes FOR UPDATE 
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own recipes" 
  ON recipes FOR DELETE 
  USING (auth.uid() = created_by);

-- Ingredients policies
CREATE POLICY "Users can view ingredients of accessible recipes" 
  ON ingredients FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = ingredients.recipe_id 
      AND (recipes.created_by = auth.uid() OR recipes.is_public = true)
    )
  );

CREATE POLICY "Users can manage ingredients of their recipes" 
  ON ingredients FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = ingredients.recipe_id 
      AND recipes.created_by = auth.uid()
    )
  );

-- Instructions policies
CREATE POLICY "Users can view instructions of accessible recipes" 
  ON instructions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = instructions.recipe_id 
      AND (recipes.created_by = auth.uid() OR recipes.is_public = true)
    )
  );

CREATE POLICY "Users can manage instructions of their recipes" 
  ON instructions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = instructions.recipe_id 
      AND recipes.created_by = auth.uid()
    )
  );

-- Recipe photos policies
CREATE POLICY "Users can view photos of accessible recipes" 
  ON recipe_photos FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_photos.recipe_id 
      AND (recipes.created_by = auth.uid() OR recipes.is_public = true)
    )
  );

CREATE POLICY "Users can upload photos to their recipes" 
  ON recipe_photos FOR INSERT 
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_photos.recipe_id 
      AND recipes.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their uploaded photos" 
  ON recipe_photos FOR DELETE 
  USING (auth.uid() = uploaded_by);

-- Recipe categories policies (public read)
CREATE POLICY "Anyone can view categories" 
  ON recipe_categories FOR SELECT 
  USING (true);

-- Recipe category mappings policies
CREATE POLICY "Users can view category mappings of accessible recipes" 
  ON recipe_category_mappings FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_category_mappings.recipe_id 
      AND (recipes.created_by = auth.uid() OR recipes.is_public = true)
    )
  );

CREATE POLICY "Users can manage category mappings of their recipes" 
  ON recipe_category_mappings FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_category_mappings.recipe_id 
      AND recipes.created_by = auth.uid()
    )
  );

-- Recipe tags policies
CREATE POLICY "Users can view tags of accessible recipes" 
  ON recipe_tags FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_tags.recipe_id 
      AND (recipes.created_by = auth.uid() OR recipes.is_public = true)
    )
  );

CREATE POLICY "Users can manage tags of their recipes" 
  ON recipe_tags FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_tags.recipe_id 
      AND recipes.created_by = auth.uid()
    )
  );

-- Recipe versions policies
CREATE POLICY "Users can view versions of their recipes" 
  ON recipe_versions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_versions.recipe_id 
      AND recipes.created_by = auth.uid()
    )
  );

-- Favorites policies
CREATE POLICY "Users can view their own favorites" 
  ON favorites FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" 
  ON favorites FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);