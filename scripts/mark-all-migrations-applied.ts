import * as dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function markMigrationsApplied() {
  console.log('🔄 Marking all migrations as applied...\n');

  const connectionString = process.env.DATABASE_URL || 
    `postgresql://postgres.${process.env.SUPABASE_PROJECT_REF}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

  const sql = postgres(connectionString, {
    ssl: 'require',
  });

  try {
    // Read the journal to get migration info
    const journalPath = path.join(process.cwd(), 'drizzle/meta/_journal.json');
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

    // Create the drizzle table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    // Mark each migration as applied
    for (const entry of journal.entries) {
      const migrationFile = `${entry.tag}.sql`;
      const hash = entry.tag; // Use tag as hash for simplicity

      // Check if already marked
      const existing = await sql`
        SELECT * FROM __drizzle_migrations WHERE hash = ${hash}
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO __drizzle_migrations (hash, created_at)
          VALUES (${hash}, ${entry.when})
        `;
        console.log(`✅ Marked ${migrationFile} as applied`);
      } else {
        console.log(`⏭️  ${migrationFile} already marked as applied`);
      }
    }

    console.log('\n✅ All migrations marked as applied!');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

markMigrationsApplied();