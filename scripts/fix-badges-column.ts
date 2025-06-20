import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing database modules
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import postgres from 'postgres';
import { getDirectDatabaseUrl } from '../lib/db/get-database-url';

async function fixBadgesColumn() {
  console.log('🔧 Fixing badges column...\n');
  
  let sql: postgres.Sql;
  
  try {
    const connectionString = getDirectDatabaseUrl();
    sql = postgres(connectionString);
    
    // Check if badges column exists
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' 
      AND column_name = 'badges'
    `;
    
    if (columns.length === 0) {
      console.log('❌ Badges column does not exist. Adding it now...');
      
      // Add the badges column
      await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS badges text[]`;
      console.log('✅ Added badges column');
      
      // Add index for better performance
      await sql`CREATE INDEX IF NOT EXISTS idx_recipes_badges ON recipes USING GIN (badges)`;
      console.log('✅ Added badges index');
      
      // Update migration tracking to prevent future issues
      try {
        const migrationHash = 'badges_column_' + Date.now();
        // Use proper integer timestamp for Drizzle migrations table
        await sql`
          INSERT INTO __drizzle_migrations (hash, created_at) 
          VALUES (${migrationHash}, ${Date.now()})
          ON CONFLICT DO NOTHING
        `;
        console.log('✅ Updated migration tracking');
      } catch (e) {
        // Migration tracking update failed, but column was added successfully
        console.log('⚠️  Could not update migration tracking, but badges column was added');
      }
      
    } else {
      console.log('✅ Badges column already exists');
    }
    
    // Verify the column exists now
    const verifyColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' 
      AND column_name = 'badges'
    `;
    
    if (verifyColumns.length > 0) {
      console.log('\n✅ Verified: badges column exists with type:', verifyColumns[0].data_type);
      
      // Test querying with badges column
      const testQuery = await sql`
        SELECT id, title, badges 
        FROM recipes 
        LIMIT 1
      `;
      console.log('✅ Successfully queried recipes table with badges column');
    } else {
      console.error('❌ Failed to add badges column');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (sql) await sql.end();
  }
  
  console.log('\n✅ Badges column fix completed successfully!');
  process.exit(0);
}

fixBadgesColumn();