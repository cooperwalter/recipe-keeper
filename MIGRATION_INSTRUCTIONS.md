# Database Migration Instructions

Since Vercel deployment doesn't have access to Supabase service role keys, you need to run the migrations manually before deploying.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `run-all-migrations.sql`
5. Click "Run" to execute all migrations

## Option 2: Using Supabase CLI (Local)

1. Install Supabase CLI:
   ```bash
   brew install supabase/tap/supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref gfbjthimmcioretpexay
   ```

3. Run migrations:
   ```bash
   supabase db push
   ```

## Option 3: Run Individual Migration Files

If you prefer to run migrations one by one:

1. In Supabase SQL Editor, run each file in order:
   - `20250613000000_initial_schema.sql` - Creates all tables
   - `20250613000001_rls_policies.sql` - Sets up Row Level Security
   - `20250613000002_storage_buckets.sql` - Creates storage buckets

## Verify Migration Success

After running migrations, verify with:
```bash
node scripts/verify-db-connection.js
```

You should see:
```
✅ Database connection verified!
✅ Ready for deployment to Vercel
```

## Important Notes

- Migrations must be run before first deployment
- The service role key should NOT be added to Vercel environment variables
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are needed for production