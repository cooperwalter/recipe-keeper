# Demo Account Setup (Development Only)

## Demo Credentials
- **Email:** demo@recipeandme.app
- **Password:** DemoRecipes2024!

## Important: Supabase Configuration

To allow the demo account to work without email confirmation, you need to:

### Option 1: Disable Email Confirmation (Development Only)
1. Go to your Supabase Dashboard
2. Navigate to Authentication → Settings
3. Under "Email Auth" section, toggle OFF "Confirm email"
4. Save changes

### Option 2: Use Supabase Inbucket (Local Development)
If running Supabase locally:
1. Access Inbucket at http://localhost:54324
2. Find the confirmation email for demo@recipeandme.app
3. Click the confirmation link

### Option 3: Manual Confirmation via SQL
Run this SQL in Supabase SQL Editor after creating the account:
```sql
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'demo@recipeandme.app';
```

## Features
The demo account automatically includes:
- Pre-populated recipes with full details
- Sample categories
- Recipe photos
- Tags and favorites

## Usage
1. The demo account is **only available in development mode** (NODE_ENV=development)
2. Go to http://localhost:3002/auth/sign-up or http://localhost:3002/auth/login
3. Click "Fill Demo Credentials" button (only visible in development)
4. Submit the form
5. If email confirmation is disabled, you'll be logged in automatically
6. Otherwise, use one of the confirmation methods above

## Security Note
The demo account credentials and auto-fill functionality are automatically disabled in production environments to prevent security issues.