-- Storage RLS Policies for Recipe and Me
-- Run this script in your Supabase SQL Editor

-- First, let's check which policies already exist
DO $$
BEGIN
    RAISE NOTICE 'Creating storage policies for Recipe and Me buckets...';
END $$;

-- Policies for ocr-uploads bucket
-- Note: These policies apply to the storage.objects table

-- Drop existing policies for ocr-uploads to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;

-- Also drop any bucket-specific policies
DROP POLICY IF EXISTS "Allow authenticated uploads ocr-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads ocr-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files ocr-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files ocr-uploads" ON storage.objects;

-- 1. Allow authenticated uploads (INSERT)
CREATE POLICY "Allow authenticated uploads ocr-uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'ocr-uploads' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

-- 2. Allow public downloads (SELECT)
CREATE POLICY "Allow public downloads ocr-uploads" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
    bucket_id = 'ocr-uploads'
);

-- 3. Allow users to update their own files (UPDATE)
CREATE POLICY "Allow users to update own files ocr-uploads" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'ocr-uploads' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
)
WITH CHECK (
    bucket_id = 'ocr-uploads' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

-- 4. Allow users to delete their own files (DELETE)
CREATE POLICY "Allow users to delete own files ocr-uploads" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'ocr-uploads' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

-- If you need to recreate policies for the other buckets, uncomment below:

/*
-- Policies for recipe-photos bucket
CREATE POLICY "Allow authenticated uploads recipe-photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'recipe-photos' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Allow public downloads recipe-photos" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
    bucket_id = 'recipe-photos'
);

CREATE POLICY "Allow users to update own files recipe-photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'recipe-photos' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
)
WITH CHECK (
    bucket_id = 'recipe-photos' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Allow users to delete own files recipe-photos" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'recipe-photos' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

-- Policies for original-recipe-cards bucket (private)
CREATE POLICY "Allow authenticated uploads original-recipe-cards" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'original-recipe-cards' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Allow authenticated downloads original-recipe-cards" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'original-recipe-cards' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Allow users to update own files original-recipe-cards" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'original-recipe-cards' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
)
WITH CHECK (
    bucket_id = 'original-recipe-cards' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Allow users to delete own files original-recipe-cards" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'original-recipe-cards' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);
*/

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (policyname LIKE '%ocr-uploads%' OR policyname LIKE 'Allow%')
ORDER BY policyname;