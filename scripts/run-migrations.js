#!/usr/bin/env node

/**
 * Automated database migration runner for Supabase
 * Ensures migrations are applied in order and only once
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Calculate checksum of migration file content
 */
function calculateChecksum(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Get list of applied migrations from database
 */
async function getAppliedMigrations() {
  // For initial setup, we need to check if migrations table exists
  // Note: In production, you might need to use Supabase SQL Editor to create
  // the initial table or use a different approach based on your permissions
  
  try {
    // First, try to select from the table to see if it exists
    const { data: checkData, error: checkError } = await supabase
      .from('schema_migrations')
      .select('filename')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST116') {
      // Table doesn't exist - this would need to be created via Supabase Dashboard
      // or with appropriate permissions
      console.error('schema_migrations table does not exist.');
      console.error('Please create it using the Supabase SQL Editor with:');
      console.error(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  checksum VARCHAR(32) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time_ms INTEGER
);`);
      throw new Error('Migration table not found');
    }
  } catch (error) {
    if (error.message === 'Migration table not found') {
      throw error;
    }
    // Table might exist, continue
  }

  // Get all applied migrations
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('filename, checksum')
    .order('filename');

  if (error) {
    console.error('Error fetching applied migrations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get list of migration files from filesystem
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure chronological order
  } catch (error) {
    console.error('Error reading migrations directory:', error);
    return [];
  }
}

/**
 * Apply a single migration
 */
async function applyMigration(filename, content, checksum) {
  const startTime = Date.now();
  
  console.log(`Applying migration: ${filename}`);
  
  try {
    // Note: Direct SQL execution requires using Supabase CLI or migrations API
    // For now, migrations need to be applied via Supabase Dashboard or CLI
    // This is a placeholder that would need to be implemented based on your setup
    
    console.warn('Note: Automatic SQL execution not implemented.');
    console.warn('Please apply migrations using Supabase CLI or Dashboard.');
    console.warn(`Migration content for ${filename}:`);
    console.warn('---');
    console.warn(content);
    console.warn('---');
    
    // For development, you might want to skip recording until properly implemented
    throw new Error('Migration execution not implemented - use Supabase CLI');

    // Record successful migration
    const executionTime = Date.now() - startTime;
    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert({
        filename,
        checksum,
        execution_time_ms: executionTime
      });

    if (recordError) {
      throw recordError;
    }

    console.log(`✓ Applied ${filename} (${executionTime}ms)`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to apply ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🔄 Checking for pending migrations...\n');

  try {
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    const appliedMap = new Map(
      appliedMigrations.map(m => [m.filename, m.checksum])
    );

    // Get migration files
    const migrationFiles = await getMigrationFiles();
    
    let pendingCount = 0;
    let appliedCount = 0;

    // Process each migration file
    for (const filename of migrationFiles) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const content = await fs.readFile(filepath, 'utf8');
      const checksum = calculateChecksum(content);

      if (appliedMap.has(filename)) {
        // Migration already applied - verify checksum
        if (appliedMap.get(filename) !== checksum) {
          console.error(`✗ Checksum mismatch for ${filename}`);
          console.error('  Migration file has been modified after being applied!');
          process.exit(1);
        }
        appliedCount++;
      } else {
        // New migration - apply it
        pendingCount++;
        await applyMigration(filename, content, checksum);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ${appliedCount} previously applied`);
    console.log(`   ${pendingCount} newly applied`);
    console.log(`   ${migrationFiles.length} total migrations\n`);

    if (pendingCount === 0) {
      console.log('✅ Database is up to date!');
    } else {
      console.log('✅ All migrations applied successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migrations
runMigrations();