import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing database modules
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { migrationDb as getMigrationDb } from '@/lib/db';

async function runMigrations() {
  console.log('🔄 Running Drizzle migrations...\n');

  try {
    // Check if we have database credentials
    if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_PASSWORD) {
      console.log('⚠️  No database credentials found.');
      console.log('\nTo run migrations, you need either:');
      console.log('1. DATABASE_URL environment variable');
      console.log('2. SUPABASE_DB_PASSWORD environment variable');
      console.log('\nGet your database password from Supabase Dashboard > Settings > Database');
      console.log('\nSkipping migrations for now...');
      process.exit(0);
    }

    // Run migrations
    const db = getMigrationDb();
    await migrate(db, { 
      migrationsFolder: path.join(process.cwd(), 'drizzle'),
    });

    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error: any) {
    // Check if it's just a "table already exists" error
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Tables already exist in database.');
      console.log('This is expected if the database was previously set up.');
      console.log('\nTo mark existing schema as migrated, run:');
      console.log('  pnpm tsx scripts/mark-migrations-applied.ts');
      console.log('\n✅ Continuing with build...');
      process.exit(0);
    }
    
    console.error('❌ Migration failed:', error);
    
    // Don't fail the build on migration errors
    if (process.env.NODE_ENV === 'production') {
      console.log('\n⚠️  Continuing build despite migration failure...');
      console.log('Please run migrations manually after deployment.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runMigrations();