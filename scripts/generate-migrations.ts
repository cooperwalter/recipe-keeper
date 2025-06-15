#!/usr/bin/env tsx

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔄 Generating database migrations...\n');

// Remove old migrations to avoid conflicts
const drizzleDir = path.join(process.cwd(), 'drizzle');
const backupDir = path.join(process.cwd(), 'drizzle-backup');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Backup existing migrations
if (fs.existsSync(drizzleDir)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, timestamp);
  fs.mkdirSync(backupPath);
  
  // Copy all files to backup
  const files = fs.readdirSync(drizzleDir);
  files.forEach(file => {
    const srcPath = path.join(drizzleDir, file);
    const destPath = path.join(backupPath, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
  
  console.log(`✅ Backed up existing migrations to ${backupPath}`);
  
  // Remove old migration files (keep meta directory)
  files.forEach(file => {
    if (file.endsWith('.sql')) {
      fs.unlinkSync(path.join(drizzleDir, file));
    }
  });
}

// Generate fresh migrations
try {
  console.log('\n📝 Generating new migrations from schema...\n');
  
  // Run drizzle-kit generate with --custom flag to skip prompts
  execSync('pnpm drizzle-kit generate --custom', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DRIZZLE_KIT_FORCE: 'true'
    }
  });
  
  console.log('\n✨ Migrations generated successfully!');
  console.log('\nNext steps:');
  console.log('1. Review the generated migrations in the drizzle/ directory');
  console.log('2. Run "pnpm db:migrate" to apply them to your database');
  
} catch (error) {
  console.error('\n❌ Failed to generate migrations:', error);
  process.exit(1);
}