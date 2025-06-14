import * as dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';
import fs from 'fs';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function markMigrationsAsApplied() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL not found in environment');
    return;
  }

  console.log('🔄 Marking existing migrations as applied...\n');
  
  const sql = postgres(dbUrl, {
    max: 1,
  });

  try {
    // First, create the drizzle schema and migrations table if they don't exist
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    
    await sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    // Read all migration files
    const migrationsDir = path.join(process.cwd(), 'drizzle');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Calculate hash of migration content
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      // Check if migration already marked as applied
      const existing = await sql`
        SELECT id FROM drizzle.__drizzle_migrations 
        WHERE hash = ${hash}
      `;
      
      if (existing.length === 0) {
        // Mark migration as applied
        await sql`
          INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${hash}, ${Date.now()})
        `;
        console.log(`✅ Marked migration as applied: ${file}`);
      } else {
        console.log(`⏭️  Migration already marked as applied: ${file}`);
      }
    }

    console.log('\n✅ All migrations marked as applied!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

markMigrationsAsApplied();