-- Simple fix for ocr-uploads bucket policies
-- This script only creates/replaces policies without trying to alter tables

-- First, check what policies currently exist
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (policyname LIKE '%ocr%' OR qual::text LIKE '%ocr-uploads%' OR with_check::text LIKE '%ocr-uploads%')
ORDER BY policyname;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads ocr-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads ocr-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files ocr-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files ocr-uploads" ON storage.objects;
DROP POLICY IF EXISTS "ocr_uploads_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "ocr_uploads_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "ocr_uploads_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "ocr_uploads_delete_policy" ON storage.objects;

-- Create new policies for ocr-uploads bucket
-- Using simple, clear policy names

-- 1. INSERT: Allow authenticated users to upload files to their folder
CREATE POLICY "Users can upload to ocr-uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'ocr-uploads' AND 
    (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- 2. SELECT: Allow everyone to view files (public bucket)
CREATE POLICY "Anyone can view ocr-uploads" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
    bucket_id = 'ocr-uploads'
);

-- 3. UPDATE: Allow users to update their own files
CREATE POLICY "Users can update own files in ocr-uploads" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'ocr-uploads' AND 
    (auth.uid())::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
    bucket_id = 'ocr-uploads' AND 
    (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- 4. DELETE: Allow users to delete their own files
CREATE POLICY "Users can delete own files in ocr-uploads" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'ocr-uploads' AND 
    (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- Show the final policies
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%ocr-uploads%'
ORDER BY cmd;