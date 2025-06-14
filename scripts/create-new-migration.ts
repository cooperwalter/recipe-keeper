import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createNewMigration() {
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    console.error('Please provide a migration name');
    console.error('Usage: pnpm tsx scripts/create-new-migration.ts <migration-name>');
    process.exit(1);
  }

  try {
    console.log(`Creating new migration: ${migrationName}`);
    
    // First generate any pending schema changes
    await execAsync('pnpm drizzle-kit generate');
    
    console.log('✅ Migration created successfully!');
    console.log('\nNext steps:');
    console.log('1. Check the new migration file in the drizzle/ directory');
    console.log('2. Run "pnpm db:migrate" to apply the migration');
    
  } catch (error) {
    console.error('Error creating migration:', error);
    process.exit(1);
  }
}

createNewMigration();