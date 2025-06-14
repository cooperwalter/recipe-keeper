import * as dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL not found in environment');
    return;
  }

  console.log('Testing connection to database...');
  console.log('Connection string:', dbUrl.replace(/:[^@]+@/, ':****@')); // Hide password
  
  try {
    const sql = postgres(dbUrl, {
      max: 1,
      timeout: 10,
    });
    
    const result = await sql`SELECT version()`;
    console.log('✅ Connection successful!');
    console.log('Database version:', result[0].version);
    
    await sql.end();
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();