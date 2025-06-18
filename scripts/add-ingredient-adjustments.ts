import * as dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function addIngredientAdjustments() {
  console.log('🔄 Adding ingredient_adjustments column...\n');

  const connectionString = process.env.DATABASE_URL || 
    `postgresql://postgres.${process.env.SUPABASE_PROJECT_REF}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

  const sql = postgres(connectionString, {
    ssl: 'require',
  });

  try {
    // Check if column already exists
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' 
      AND column_name = 'ingredient_adjustments'
    `;

    if (columns.length > 0) {
      console.log('✅ Column ingredient_adjustments already exists!');
    } else {
      // Add the column
      await sql`
        ALTER TABLE recipes 
        ADD COLUMN ingredient_adjustments jsonb
      `;
      console.log('✅ Column ingredient_adjustments added successfully!');
    }

    // Also add user_profiles table if it doesn't exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles'
    `;

    if (tables.length === 0) {
      await sql`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL UNIQUE,
          name text,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles (user_id)
      `;
      console.log('✅ Table user_profiles created successfully!');
    } else {
      console.log('✅ Table user_profiles already exists!');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

addIngredientAdjustments();