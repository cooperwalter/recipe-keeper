import * as dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';
import fs from 'fs';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkMigrationStatus() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL not found in environment');
    return;
  }

  console.log('📊 Checking migration status...\n');
  
  const sql = postgres(dbUrl, {
    max: 1,
  });

  try {
    // Check if drizzle migrations table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        AND table_name = '__drizzle_migrations'
      )
    `;

    if (!tableExists[0].exists) {
      console.log('❌ Drizzle migrations table not found.');
      console.log('Run "pnpm tsx scripts/mark-migrations-applied.ts" to initialize.');
      return;
    }

    // Get applied migrations
    const appliedMigrations = await sql`
      SELECT hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY created_at
    `;

    // Read migration files
    const migrationsDir = path.join(process.cwd(), 'drizzle');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('📁 Migration files:');
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      const applied = appliedMigrations.find(m => m.hash === hash);
      if (applied) {
        const date = new Date(Number(applied.created_at));
        console.log(`  ✅ ${file} (applied on ${date.toLocaleString()})`);
      } else {
        console.log(`  ⏳ ${file} (pending)`);
      }
    }

    // Check for tables in database
    console.log('\n📊 Database tables:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    for (const table of tables) {
      console.log(`  • ${table.table_name}`);
    }

    console.log('\n✅ Migration status check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkMigrationStatus();