#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { z } from 'zod';

// Define the schema for our environment variables (same as in lib/env.ts)
const envSchema = z.object({
  // Required Supabase variables
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  
  // Required for database operations
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // Required for OCR functionality
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  
  // Optional variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

// Load .env.local file explicitly
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envExamplePath = path.resolve(process.cwd(), '.env.example');

console.log('🔍 Checking environment variables...\n');

// Check if .env.local exists
if (!fs.existsSync(envLocalPath)) {
  console.error('❌ .env.local file not found!');
  console.error(`\nPlease create a .env.local file in the project root.`);
  
  if (fs.existsSync(envExamplePath)) {
    console.error('You can copy .env.example as a starting point:');
    console.error('\n  cp .env.example .env.local\n');
    
    // Show the contents of .env.example
    try {
      const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
      console.error('Contents of .env.example:');
      console.error('========================');
      console.error(exampleContent);
      console.error('========================\n');
    } catch (err) {
      // Ignore error if can't read example file
    }
  }
  
  process.exit(1);
}

// Load the .env.local file
const result = dotenv.config({ path: envLocalPath });

if (result.error) {
  console.error('❌ Error loading .env.local file:', result.error.message);
  process.exit(1);
}

console.log(`✅ Found .env.local file at: ${envLocalPath}`);

// Count loaded variables
const loadedVars = Object.keys(result.parsed || {}).length;
console.log(`📊 Loaded ${loadedVars} environment variables from .env.local\n`);

// Now validate the environment variables
console.log('🔍 Validating environment variables...\n');

try {
  // Validate environment variables
  const env = envSchema.parse(process.env);
  
  console.log('✅ All required environment variables are set!\n');
  
  // Show configuration summary
  console.log('Configuration Summary:');
  console.log('====================');
  console.log(`Supabase URL: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`Supabase Anon Key: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...`);
  console.log(`Database URL: ${env.DATABASE_URL.replace(/:[^@]+@/, ':****@')}`);
  console.log(`Anthropic API Key: ${env.ANTHROPIC_API_KEY.substring(0, 10)}...`);
  
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`Service Role Key: ${env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}... (optional)`);
  }
  
  console.log('\n✨ Environment configuration is valid!');
  
  // Check for common issues
  console.log('\n📋 Additional Checks:');
  console.log('===================');
  
  // Check if using localhost URLs (common mistake)
  if (env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost')) {
    console.warn('⚠️  Warning: Using localhost URL for Supabase. Make sure this is intentional.');
  }
  
  // Check if keys look like placeholders
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-anon-key' || 
      env.ANTHROPIC_API_KEY === 'your-anthropic-api-key') {
    console.error('❌ Error: Some values look like placeholders. Please use real API keys.');
    process.exit(1);
  }
  
  // Check database URL format
  if (!env.DATABASE_URL.startsWith('postgresql://') && !env.DATABASE_URL.startsWith('postgres://')) {
    console.warn('⚠️  Warning: DATABASE_URL should start with postgresql:// or postgres://');
  }
  
  console.log('✅ No issues found');
  
  process.exit(0);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed!\n');
    
    const missingVars: string[] = [];
    const invalidVars: string[] = [];
    
    error.errors.forEach(err => {
      const varName = err.path.join('.');
      if (err.message.includes('required')) {
        missingVars.push(varName);
      } else {
        invalidVars.push(`${varName}: ${err.message}`);
      }
    });
    
    if (missingVars.length > 0) {
      console.error('Missing variables:');
      missingVars.forEach(v => console.error(`  - ${v}`));
      console.error('');
    }
    
    if (invalidVars.length > 0) {
      console.error('Invalid variables:');
      invalidVars.forEach(v => console.error(`  - ${v}`));
      console.error('');
    }
    
    console.error('Please check your .env.local file and ensure all required variables are set correctly.');
    
    if (fs.existsSync(envExamplePath)) {
      console.error('\nRefer to .env.example for the required format.');
    }
    
    process.exit(1);
  }
  
  console.error('❌ Unexpected error:', error);
  process.exit(1);
}