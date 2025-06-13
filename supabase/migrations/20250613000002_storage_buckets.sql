-- Create storage buckets for recipe photos and original recipe cards
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('recipe-photos', 'recipe-photos', true),
  ('original-recipe-cards', 'original-recipe-cards', true);

-- Set up storage policies for recipe-photos bucket
CREATE POLICY "Users can view recipe photos" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'recipe-photos');

CREATE POLICY "Users can upload recipe photos" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'recipe-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their recipe photos" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'recipe-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their recipe photos" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'recipe-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Set up storage policies for original-recipe-cards bucket
CREATE POLICY "Users can view original recipe cards" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'original-recipe-cards');

CREATE POLICY "Users can upload original recipe cards" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'original-recipe-cards' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their original recipe cards" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'original-recipe-cards' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their original recipe cards" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'original-recipe-cards' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );