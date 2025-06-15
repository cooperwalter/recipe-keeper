#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkStorageBuckets() {
  console.log('🔍 Checking storage buckets...\n');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Create a direct Supabase client for script usage
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const requiredBuckets = [
    { name: 'recipe-photos', description: 'Stores recipe photos' },
    { name: 'ocr-uploads', description: 'Temporary storage for OCR processing' },
    { name: 'original-recipe-cards', description: 'Stores original recipe card images' },
  ];

  const missingBuckets: string[] = [];

  for (const bucket of requiredBuckets) {
    try {
      // Try to list files in the bucket (will fail if bucket doesn't exist)
      const { error } = await supabase.storage.from(bucket.name).list('', { limit: 1 });
      
      if (error?.message?.includes('Bucket not found')) {
        console.log(`❌ Missing bucket: ${bucket.name} - ${bucket.description}`);
        missingBuckets.push(bucket.name);
      } else {
        console.log(`✅ Found bucket: ${bucket.name}`);
      }
    } catch (error) {
      console.error(`❌ Error checking bucket "${bucket.name}":`, error);
      missingBuckets.push(bucket.name);
    }
  }

  if (missingBuckets.length > 0) {
    console.log('\n⚠️  Missing storage buckets detected!');
    console.log('\nTo fix this, go to your Supabase Dashboard:');
    console.log('1. Navigate to Storage');
    console.log('2. Create the following buckets:\n');
    
    missingBuckets.forEach(bucketName => {
      console.log(`   Bucket name: ${bucketName}`);
      if (bucketName === 'recipe-photos' || bucketName === 'ocr-uploads') {
        console.log('   - Public: Yes');
      } else {
        console.log('   - Public: No');
      }
      console.log('   - File size limit: 10MB');
      console.log('   - Allowed MIME types: image/jpeg, image/png, image/webp\n');
    });

    console.log('3. For each bucket, set up RLS policies:');
    console.log('   - INSERT: (auth.uid() = (storage.foldername(name))[1])');
    console.log('   - SELECT: true (for public buckets) or (auth.uid() = (storage.foldername(name))[1])');
    console.log('   - DELETE: (auth.uid() = (storage.foldername(name))[1])');
    
    process.exit(1);
  } else {
    console.log('\n✨ All required storage buckets are present!');
  }
}

// Run the check
checkStorageBuckets().catch((error) => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});