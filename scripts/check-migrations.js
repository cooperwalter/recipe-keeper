#!/usr/bin/env node

/**
 * Check migration status without applying any changes
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: '.env.local' });

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function calculateChecksum(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function checkMigrationStatus() {
  console.log('📋 Migration Status Report\n');

  try {
    // Get applied migrations
    const { data: appliedMigrations, error } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('filename');

    if (error && error.code !== 'PGRST116') { // Table doesn't exist
      throw error;
    }

    const appliedMap = new Map(
      (appliedMigrations || []).map(m => [m.filename, m])
    );

    // Get migration files
    const files = await fs.readdir(MIGRATIONS_DIR).catch(() => []);
    const migrationFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log('Status | Migration File                    | Applied At         | Checksum');
    console.log('-------|-----------------------------------|-------------------|----------');

    let pendingCount = 0;
    let appliedCount = 0;
    let modifiedCount = 0;

    for (const filename of migrationFiles) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const content = await fs.readFile(filepath, 'utf8');
      const currentChecksum = calculateChecksum(content);
      const applied = appliedMap.get(filename);

      if (applied) {
        const checksumMatch = applied.checksum === currentChecksum;
        const status = checksumMatch ? '✅' : '⚠️ ';
        const appliedDate = new Date(applied.applied_at).toISOString().split('T')[0];
        
        console.log(
          `${status}     | ${filename.padEnd(33)} | ${appliedDate}     | ${
            checksumMatch ? 'Valid' : 'Modified!'
          }`
        );
        
        appliedCount++;
        if (!checksumMatch) modifiedCount++;
      } else {
        console.log(`⏳     | ${filename.padEnd(33)} | Pending           | -`);
        pendingCount++;
      }
    }

    // Check for applied migrations without files
    console.log('\n');
    for (const [filename, migration] of appliedMap) {
      if (!migrationFiles.includes(filename)) {
        console.log(`❓ Missing file: ${filename} (applied ${new Date(migration.applied_at).toISOString().split('T')[0]})`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ${appliedCount} applied`);
    console.log(`   ${pendingCount} pending`);
    console.log(`   ${modifiedCount} modified (warning!)`);
    console.log(`   ${migrationFiles.length} total files\n`);

    if (modifiedCount > 0) {
      console.log('⚠️  Warning: Some applied migrations have been modified!');
      process.exit(1);
    } else if (pendingCount > 0) {
      console.log('ℹ️  Run `pnpm migrate:up` to apply pending migrations');
      process.exit(0);
    } else {
      console.log('✅ All migrations are up to date!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkMigrationStatus();