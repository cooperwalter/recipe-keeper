# Database Migration Guide

This guide explains how to set up automatic, idempotent migrations for your Recipe and Me app.

## Current Setup

All migrations are written to be **idempotent** (can be run multiple times safely) using:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `INSERT ... ON CONFLICT DO NOTHING`
- `CREATE OR REPLACE FUNCTION`

## Initial Setup (One Time)

### 1. Run Initial Migrations

Go to your Supabase Dashboard > SQL Editor and run these files in order:

1. **Initial Schema** (`20250613000000_initial_schema_idempotent.sql`)
2. **RLS Policies** (`20250613000001_rls_policies.sql`)
3. **Storage Buckets** (`20250613000002_storage_buckets.sql`)

### 2. Create Migration Tracking Table

Run this in SQL Editor to track migrations:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT
);
```

## Automatic Migrations (Recommended Approaches)

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/migrate.yml`:

```yaml
name: Run Migrations

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Run migrations
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: |
          supabase link --project-ref $SUPABASE_PROJECT_ID
          supabase db push
```

### Option 2: Supabase Edge Function

Create an Edge Function that can run migrations:

```typescript
// supabase/functions/run-migrations/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const migrations = [
  { version: '20250613000000', file: 'initial_schema_idempotent.sql' },
  { version: '20250613000001', file: 'rls_policies.sql' },
  { version: '20250613000002', file: 'storage_buckets.sql' }
]

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('MIGRATION_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const results = []
  
  for (const migration of migrations) {
    // Check if already applied
    const { data: existing } = await supabase
      .from('schema_migrations')
      .select('version')
      .eq('version', migration.version)
      .single()
    
    if (!existing) {
      // Run migration (simplified - in practice, read from file)
      const { error } = await supabase.rpc('exec_sql', { 
        sql: getMigrationSQL(migration.file) 
      })
      
      if (!error) {
        await supabase.from('schema_migrations').insert({
          version: migration.version,
          checksum: calculateChecksum(getMigrationSQL(migration.file))
        })
        results.push(`✅ Applied ${migration.version}`)
      } else {
        results.push(`❌ Failed ${migration.version}: ${error.message}`)
      }
    } else {
      results.push(`⏭️  Skipped ${migration.version} (already applied)`)
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Option 3: Build-Time Check with Manual Fallback

Update `package.json`:

```json
{
  "scripts": {
    "build": "node scripts/run-migrations-production.js && next build",
    "build:skip-migrations": "next build"
  }
}
```

This approach:
1. Checks if migrations are needed
2. Warns if manual intervention required
3. Doesn't fail the build
4. Provides clear instructions

## Creating New Migrations

### 1. Create Migration File

```bash
# Create new migration with timestamp
echo "-- Description of changes" > supabase/migrations/$(date +%Y%m%d%H%M%S)_migration_name.sql
```

### 2. Write Idempotent SQL

Always use idempotent patterns:

```sql
-- Tables
CREATE TABLE IF NOT EXISTS table_name (...);

-- Columns
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;

-- Indexes
CREATE INDEX IF NOT EXISTS index_name ON table_name(column);

-- Functions
CREATE OR REPLACE FUNCTION function_name() ...;

-- Data
INSERT INTO table_name (columns) VALUES (values) ON CONFLICT DO NOTHING;
```

### 3. Test Locally

```bash
# Reset local database
supabase db reset

# Apply all migrations
supabase db push
```

## Vercel Deployment

### Environment Variables

Only these are needed in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Build Configuration

The build script will:
1. Check database connectivity
2. Verify tables exist
3. Warn if migrations needed
4. Continue with build (won't fail)

### Post-Deployment

After deployment, verify migrations:

```bash
node scripts/verify-db-connection.js
```

## Best Practices

1. **Always write idempotent migrations**
2. **Test migrations locally first**
3. **Use version numbers in filenames**
4. **Document breaking changes**
5. **Keep migrations small and focused**
6. **Never modify existing migrations**
7. **Add new migrations for changes**

## Troubleshooting

### "Tables not found" during build
- Normal for first deployment
- Run migrations manually in Supabase Dashboard
- Future builds will pass

### Migration conflicts
- Check `schema_migrations` table
- Ensure version numbers are unique
- Use timestamps in filenames

### RLS policy errors
- Ensure auth.users exists before creating policies
- Check policy syntax in Supabase Dashboard