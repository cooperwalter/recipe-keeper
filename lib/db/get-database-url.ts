export function getDatabaseUrl(): string {
  // If DATABASE_URL is set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Otherwise, construct from Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!supabasePassword) {
    throw new Error('SUPABASE_DB_PASSWORD is not set. Get it from Supabase Dashboard > Settings > Database');
  }

  // Extract project ref from Supabase URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    throw new Error('Invalid SUPABASE_URL format');
  }

  // Construct the database URL
  // Using pooler for connection pooling (recommended for serverless)
  return `postgresql://postgres.${projectRef}:${supabasePassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
}

// For direct connections (migrations)
export function getDirectDatabaseUrl(): string {
  // If DATABASE_URL is set, use it directly for migrations
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  const baseUrl = getDatabaseUrl();
  // Replace pooler with direct connection
  return baseUrl.replace('pooler.supabase.com:6543', 'supabase.com:5432').replace('?pgbouncer=true', '');
}