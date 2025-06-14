import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getDatabaseUrl, getDirectDatabaseUrl } from './get-database-url';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let migrationDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Lazy initialize database connection for queries
function getDb() {
  if (!dbInstance) {
    try {
      // For queries - using connection pooling
      const queryClient = postgres(getDatabaseUrl(), {
        prepare: false,
        // Use connection pooling for better performance
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      dbInstance = drizzle(queryClient, { schema });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
  return dbInstance;
}

// Lazy initialize database connection for migrations
function getMigrationDb() {
  if (!migrationDbInstance) {
    try {
      // For migrations - direct connection
      const migrationClient = postgres(getDirectDatabaseUrl(), { 
        max: 1,
        onnotice: () => {}, // Suppress notices during migrations
      });
      migrationDbInstance = drizzle(migrationClient, { schema });
    } catch (error) {
      console.error('Failed to initialize migration database:', error);
      throw error;
    }
  }
  return migrationDbInstance;
}

// Export a proxy that lazily initializes the database
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop, receiver) {
    const actualDb = getDb();
    return Reflect.get(actualDb, prop, receiver);
  },
});

// Export migration db getter
export { getMigrationDb as migrationDb };

// Re-export schema types
export * from './schema';