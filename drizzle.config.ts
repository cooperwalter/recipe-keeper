import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing database modules
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { getDirectDatabaseUrl } from './lib/db/get-database-url';

let connectionString: string;

try {
  // Use direct connection for migrations (not pooled)
  connectionString = getDirectDatabaseUrl();
} catch (error) {
  console.error('Failed to get database URL:', error);
  // Provide a dummy URL to prevent config errors
  connectionString = 'postgresql://dummy:dummy@localhost:5432/dummy';
}

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
} satisfies Config;