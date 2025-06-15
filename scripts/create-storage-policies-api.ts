#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_PROJECT_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nNote: You need the service role key to create policies programmatically.');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_PROJECT_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from Supabase URL');
  process.exit(1);
}

async function createStoragePolicies() {
  console.log('🔧 Creating storage policies via Supabase API...\n');
  console.log(`Project: ${projectRef}`);
  console.log(`URL: ${SUPABASE_PROJECT_URL}\n`);

  // For now, the best approach is to run SQL directly
  const policiesSQL = `
-- Policies for ocr-uploads bucket
DO $$
BEGIN
  -- Drop existing policies if they exist (to avoid conflicts)
  DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
  
  -- Create new policies
  -- 1. Allow authenticated uploads (INSERT)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated uploads ocr-uploads'
  ) THEN
    CREATE POLICY "Allow authenticated uploads ocr-uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'ocr-uploads' AND 
      (auth.uid()::text = (storage.foldername(name))[1])
    );
  END IF;

  -- 2. Allow public downloads (SELECT)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public downloads ocr-uploads'
  ) THEN
    CREATE POLICY "Allow public downloads ocr-uploads" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (
      bucket_id = 'ocr-uploads'
    );
  END IF;

  -- 3. Allow users to update their own files (UPDATE)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow users to update own files ocr-uploads'
  ) THEN
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
  END IF;

  -- 4. Allow users to delete their own files (DELETE)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow users to delete own files ocr-uploads'
  ) THEN
    CREATE POLICY "Allow users to delete own files ocr-uploads" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'ocr-uploads' AND 
      (auth.uid()::text = (storage.foldername(name))[1])
    );
  END IF;

  RAISE NOTICE 'Storage policies created successfully!';
END $$;
  `;

  console.log('📝 SQL to run in Supabase Dashboard:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('2. Copy and paste this SQL:\n');
  console.log('```sql');
  console.log(policiesSQL);
  console.log('```\n');
  console.log('3. Click "Run" to execute the SQL\n');
  
  console.log('Alternative: Run via Supabase CLI');
  console.log('─'.repeat(50));
  console.log('If you have the Supabase CLI installed:');
  console.log(`\nsupabase db execute --project-ref ${projectRef} --file scripts/create-storage-policies.sql\n`);
}

// Run the script
createStoragePolicies().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});