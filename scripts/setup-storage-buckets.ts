#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these in your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupStorageBuckets() {
  console.log('🪣 Setting up storage buckets...\n');

  const buckets = [
    {
      name: 'recipe-photos',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    },
    {
      name: 'ocr-uploads',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    },
    {
      name: 'original-recipe-cards',
      public: false, // Private bucket for original recipe cards
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    },
  ];

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBucket, error: checkError } = await supabase
        .storage
        .getBucket(bucket.name);

      if (existingBucket) {
        console.log(`✅ Bucket "${bucket.name}" already exists`);
        
        // Update bucket configuration
        const { data, error: updateError } = await supabase.storage.updateBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes,
        });

        if (updateError) {
          console.error(`❌ Failed to update bucket "${bucket.name}":`, updateError.message);
        } else {
          console.log(`✅ Updated configuration for bucket "${bucket.name}"`);
        }
      } else {
        // Create bucket
        const { data, error: createError } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes,
        });

        if (createError) {
          console.error(`❌ Failed to create bucket "${bucket.name}":`, createError.message);
        } else {
          console.log(`✅ Created bucket "${bucket.name}"`);
        }
      }

      // Set up RLS policies for the bucket
      if (bucket.name === 'recipe-photos' || bucket.name === 'ocr-uploads') {
        await setupBucketPolicies(bucket.name, bucket.public);
      }
    } catch (error) {
      console.error(`❌ Error setting up bucket "${bucket.name}":`, error);
    }
  }

  console.log('\n✨ Storage bucket setup complete!');
}

async function setupBucketPolicies(bucketName: string, isPublic: boolean) {
  console.log(`📋 Setting up RLS policies for "${bucketName}"...`);

  // For public buckets, we need to ensure proper policies
  const policies = [
    {
      name: `Give users access to own folder in ${bucketName}`,
      definition: `(auth.uid() = (storage.foldername(name))[1])`,
      operation: 'INSERT' as const,
    },
    {
      name: `Give users access to view files in ${bucketName}`,
      definition: isPublic ? 'true' : `(auth.uid() = (storage.foldername(name))[1])`,
      operation: 'SELECT' as const,
    },
    {
      name: `Give users access to delete own files in ${bucketName}`,
      definition: `(auth.uid() = (storage.foldername(name))[1])`,
      operation: 'DELETE' as const,
    },
  ];

  // Note: Supabase doesn't provide a direct API for managing storage policies
  // These would need to be set up in the Supabase Dashboard
  console.log(`ℹ️  Please ensure the following RLS policies are set up in Supabase Dashboard:`);
  policies.forEach((policy) => {
    console.log(`  - ${policy.operation}: ${policy.name}`);
    console.log(`    Definition: ${policy.definition}`);
  });
}

// Run the setup
setupStorageBuckets().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});