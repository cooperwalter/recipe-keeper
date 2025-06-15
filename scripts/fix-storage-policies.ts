#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function fixStoragePolicies() {
  console.log('🔧 Storage RLS Policy Helper\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  console.log('📋 Storage RLS Policy Instructions:\n');
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to Storage → Policies\n');

  const buckets = ['recipe-photos', 'ocr-uploads', 'original-recipe-cards'];

  for (const bucket of buckets) {
    console.log(`\n📦 Bucket: ${bucket}`);
    console.log('─'.repeat(50));
    
    console.log('\n1️⃣ Policy: Allow authenticated uploads');
    console.log('   - Name: Allow authenticated uploads');
    console.log('   - Target roles: authenticated');
    console.log('   - Operations: INSERT');
    console.log('   - WITH CHECK expression:');
    console.log('     ```sql');
    console.log('     (auth.uid()::text = (storage.foldername(name))[1])');
    console.log('     ```');
    
    if (bucket === 'recipe-photos' || bucket === 'ocr-uploads') {
      console.log('\n2️⃣ Policy: Allow public downloads');
      console.log('   - Name: Allow public downloads');
      console.log('   - Target roles: anon, authenticated');
      console.log('   - Operations: SELECT');
      console.log('   - USING expression:');
      console.log('     ```sql');
      console.log('     true');
      console.log('     ```');
    } else {
      console.log('\n2️⃣ Policy: Allow authenticated downloads');
      console.log('   - Name: Allow authenticated downloads');
      console.log('   - Target roles: authenticated');
      console.log('   - Operations: SELECT');
      console.log('   - USING expression:');
      console.log('     ```sql');
      console.log('     (auth.uid()::text = (storage.foldername(name))[1])');
      console.log('     ```');
    }
    
    console.log('\n3️⃣ Policy: Allow users to update own files');
    console.log('   - Name: Allow users to update own files');
    console.log('   - Target roles: authenticated');
    console.log('   - Operations: UPDATE');
    console.log('   - USING expression:');
    console.log('     ```sql');
    console.log('     (auth.uid()::text = (storage.foldername(name))[1])');
    console.log('     ```');
    console.log('   - WITH CHECK expression:');
    console.log('     ```sql');
    console.log('     (auth.uid()::text = (storage.foldername(name))[1])');
    console.log('     ```');
    
    console.log('\n4️⃣ Policy: Allow users to delete own files');
    console.log('   - Name: Allow users to delete own files');
    console.log('   - Target roles: authenticated');
    console.log('   - Operations: DELETE');
    console.log('   - USING expression:');
    console.log('     ```sql');
    console.log('     (auth.uid()::text = (storage.foldername(name))[1])');
    console.log('     ```');
  }

  console.log('\n\n💡 Testing the fix:');
  console.log('1. After creating/updating the policies, try uploading an image again');
  console.log('2. The file path format should be: {user-id}/{timestamp}-{filename}');
  console.log('3. Make sure each policy has the correct expression for its operation\n');

  // If we have a service key, we can test the connection
  if (supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔍 Testing connection and checking buckets...\n');
    
    for (const bucket of buckets) {
      try {
        const { data, error } = await supabase.storage.getBucket(bucket);
        if (data) {
          console.log(`✅ Bucket "${bucket}" exists`);
        } else if (error) {
          console.log(`❌ Bucket "${bucket}" error:`, error.message);
        }
      } catch (err) {
        console.log(`❌ Failed to check bucket "${bucket}"`);
      }
    }
  }
}

// Run the helper
fixStoragePolicies().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});