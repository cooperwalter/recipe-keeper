# Deployment Guide for Vercel

## Prerequisites

1. Install Vercel CLI (optional but recommended):
   ```bash
   pnpm install -g vercel
   ```

2. Create a Vercel account at https://vercel.com

## Environment Variables

You'll need to set the following environment variables in your Vercel project:

### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Variables (for advanced features)
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Only if using server-side features
```

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Run the deployment command:
   ```bash
   vercel
   ```

2. Follow the prompts:
   - Select your account
   - Link to existing project or create new
   - Confirm project settings

3. Set environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. Deploy to production:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. Push your code to GitHub

2. Go to https://vercel.com/new

3. Import your GitHub repository

4. Configure project:
   - Framework Preset: Next.js
   - Build Command: `pnpm build` (auto-detected)
   - Install Command: `pnpm install` (auto-detected)

5. Add environment variables in the Vercel dashboard

6. Click "Deploy"

## Post-Deployment

### 1. Update Supabase Allowed URLs

In your Supabase project settings:
1. Go to Authentication → URL Configuration
2. Add your Vercel URLs to:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: 
     - `https://your-app.vercel.app/*`
     - `https://your-custom-domain.com/*` (if using custom domain)

### 2. Set up Custom Domain (Optional)

1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update Supabase redirect URLs

### 3. Configure Production Database

Since the migration scripts require service role key (which shouldn't be exposed in production), you have two options:

**Option A: Run migrations locally before deployment**
```bash
pnpm migrate:up
```

**Option B: Use Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run migration files manually

## Monitoring

- View deployment logs in Vercel dashboard
- Set up Vercel Analytics (optional)
- Monitor Supabase usage in Supabase dashboard

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify pnpm version matches: `10.11.0`

### Authentication Issues
- Verify Supabase URLs are correctly configured
- Check that environment variables are set for the correct environment (production/preview)
- Ensure redirect URLs include your Vercel domain

### Database Connection Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is not paused
- Ensure RLS policies are properly configured

## Security Notes

1. Never commit `.env.local` file
2. Keep `SUPABASE_SERVICE_ROLE_KEY` secure and only use in server-side code
3. Demo account features are automatically disabled in production
4. Ensure RLS (Row Level Security) is enabled on all tables