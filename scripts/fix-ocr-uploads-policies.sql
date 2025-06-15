-- Fix RLS Policies for ocr-uploads bucket
-- This script ensures proper policies are set for the ocr-uploads bucket

-- First, let's see what policies currently exist
SELECT 
    policyname,
    tablename,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (policyname LIKE '%ocr%' OR qual::text LIKE '%ocr-uploads%' OR with_check::text LIKE '%ocr-uploads%')
ORDER BY policyname;

-- Drop ALL existing policies that might affect ocr-uploads
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Find and drop all policies that might be affecting ocr-uploads
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname LIKE '%ocr%' 
            OR policyname LIKE '%upload%'
            OR policyname LIKE '%authenticated%'
            OR policyname LIKE '%public%'
            OR qual::text LIKE '%ocr-uploads%' 
            OR with_check::text LIKE '%ocr-uploads%'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Create fresh policies for ocr-uploads bucket
-- These policies are specific to the ocr-uploads bucket

-- 1. Allow authenticated users to upload to their own folder
CREATE POLICY "ocr_uploads_insert_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'ocr-uploads' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- 2. Allow anyone to view files in ocr-uploads (public bucket)
CREATE POLICY "ocr_uploads_select_policy" ON storage.objects
FOR SELECT TO public
USING (
    bucket_id = 'ocr-uploads'
);

-- 3. Allow users to update their own files
CREATE POLICY "ocr_uploads_update_policy" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'ocr-uploads' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
    bucket_id = 'ocr-uploads' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- 4. Allow users to delete their own files
CREATE POLICY "ocr_uploads_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'ocr-uploads' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Also create policies for recipe-photos if they don't exist
-- Check if recipe-photos policies exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'recipe_photos_insert_policy'
    ) THEN
        -- 1. Allow authenticated users to upload to their own folder
        CREATE POLICY "recipe_photos_insert_policy" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'recipe-photos' AND 
            auth.uid()::text = (string_to_array(name, '/'))[1]
        );

        -- 2. Allow anyone to view files in recipe-photos (public bucket)
        CREATE POLICY "recipe_photos_select_policy" ON storage.objects
        FOR SELECT TO public
        USING (
            bucket_id = 'recipe-photos'
        );

        -- 3. Allow users to update their own files
        CREATE POLICY "recipe_photos_update_policy" ON storage.objects
        FOR UPDATE TO authenticated
        USING (
            bucket_id = 'recipe-photos' AND 
            auth.uid()::text = (string_to_array(name, '/'))[1]
        )
        WITH CHECK (
            bucket_id = 'recipe-photos' AND 
            auth.uid()::text = (string_to_array(name, '/'))[1]
        );

        -- 4. Allow users to delete their own files
        CREATE POLICY "recipe_photos_delete_policy" ON storage.objects
        FOR DELETE TO authenticated
        USING (
            bucket_id = 'recipe-photos' AND 
            auth.uid()::text = (string_to_array(name, '/'))[1]
        );
    END IF;
END $$;

-- Verify the policies were created
SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN substring(qual::text, 1, 50) || '...'
        ELSE 'N/A'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN substring(with_check::text, 1, 50) || '...'
        ELSE 'N/A'
    END as check_clause
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (policyname LIKE '%ocr%' OR policyname LIKE '%recipe_photos%')
ORDER BY policyname;

-- Also check if RLS is enabled on the storage.objects table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';

-- If RLS is not enabled, enable it
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;