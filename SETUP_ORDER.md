# Setup Order for Recipe and Me

Follow these steps in order to set up your Recipe and Me database and demo account:

## 1. Run Database Migrations FIRST

Go to Supabase Dashboard > SQL Editor and run:

```sql
-- Copy and paste the contents of: run-all-migrations.sql
```

This creates:
- All database tables (categories, recipes, etc.)
- Row Level Security policies
- Functions and triggers
- Default categories

## 2. Verify Database Setup

Run this to check if tables exist:

```bash
node scripts/verify-db-connection.js
```

You should see: "✅ Database connection verified!"

## 3. Create Demo Account

Go to http://localhost:3002/auth/sign-up and create account with:
- Email: `demo@recipeandme.app`
- Password: `DemoRecipes2024!`

## 4. Seed Demo Recipes

After creating the demo account, run ONE of these options:

### Option A: JavaScript (easiest for local dev)
```bash
node scripts/seed-demo-recipes.js
```

### Option B: SQL with manual ID
1. Get the demo user ID:
   ```sql
   SELECT id FROM auth.users WHERE email = 'demo@recipeandme.app';
   ```
2. Edit `seed-demo-recipes.sql` and replace `YOUR_DEMO_USER_ID`
3. Run the SQL in Supabase Dashboard

### Option C: Automated SQL
Run `seed-demo-auto.sql` in Supabase Dashboard (tries to find user automatically)

## Common Errors

### "relation categories does not exist"
- You haven't run the migrations yet
- Go back to step 1

### "Demo user not found"
- You haven't created the demo account yet
- Go back to step 3

### "Missing required environment variables"
- Check your `.env.local` file has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Quick Setup Script

For a complete setup, run these in order:

```bash
# 1. Check environment
cat .env.local

# 2. Run migrations (in Supabase Dashboard)
# Copy contents of run-all-migrations.sql

# 3. Verify database
node scripts/verify-db-connection.js

# 4. Create demo account at http://localhost:3002/auth/sign-up

# 5. Seed demo recipes
node scripts/seed-demo-recipes.js
```