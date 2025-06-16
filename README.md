# Recipe Inheritance Keeper

A family recipe preservation platform that captures, digitizes, and shares cherished family recipes across generations. Built with Next.js, Supabase, and Drizzle ORM.

## Features

- **Smart OCR Recipe Capture**: Upload photos of recipe cards and automatically extract text using AI
- **Voice-to-Recipe**: Speak changes to recipes and have them interpreted by AI
- **Recipe Management**: Create, edit, and organize recipes with ingredients and instructions
- **Photo Gallery**: Attach multiple photos to recipes including the original recipe card
- **Categories & Tags**: Organize recipes by category and add custom tags
- **Favorites**: Mark your favorite family recipes
- **Version History**: Track changes to recipes over time
- **Authentication**: Secure user accounts with Supabase Auth
- **Responsive Design**: Works beautifully on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI/OCR**: Anthropic Claude for text extraction
- **Styling**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest + React Testing Library

## Prerequisites

- Node.js 18+ and pnpm
- Supabase account
- Anthropic API key (for OCR and AI features)
- OpenAI API key (required in production for voice transcription)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/recipe-keeper.git
cd recipe-keeper
pnpm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site URL for production (for email redirects)
# Leave empty in development - it will use window.location.origin
NEXT_PUBLIC_SITE_URL=https://your-app-domain.com

# Database (use connection pooler URL from Supabase)
DATABASE_URL=postgresql://...

# Anthropic API (for OCR and AI features)
ANTHROPIC_API_KEY=your-anthropic-api-key

# OpenAI API (REQUIRED in production for voice transcription)
# The app will not start in production without this key
# In development, voice features will use mock transcription
OPENAI_API_KEY=your-openai-api-key

# Optional: Service role key for admin operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Configure Supabase Authentication

#### Email Redirect URLs

For authentication emails to work correctly in production:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Add your production URLs to the **Redirect URLs** list:
   - `https://your-app-domain.com/protected` (for email confirmation)
   - `https://your-app-domain.com/auth/update-password` (for password reset)
   - Add `http://localhost:3002/*` for local development

5. Make sure to set `NEXT_PUBLIC_SITE_URL` in your production environment variables

#### Email Templates (Optional)

The default Supabase email templates work well, but you can customize them:

1. Go to **Authentication** → **Email Templates**
2. Customize the templates as needed
3. Make sure to keep the `{{ .ConfirmationURL }}` variable in the templates

### 4. Set up Supabase Storage Buckets

The app requires three storage buckets for storing recipe photos and OCR uploads. Follow these steps to create them:

#### Step 1: Create the buckets

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket** and create each of these buckets:

##### Bucket 1: `recipe-photos`
- **Name**: `recipe-photos`
- **Public bucket**: ✅ Yes (toggle on)
- **File size limit**: 10 MB
- **Allowed MIME types**: 
  ```
  image/jpeg
  image/png
  image/webp
  image/heic
  image/heif
  ```

##### Bucket 2: `ocr-uploads`
- **Name**: `ocr-uploads`
- **Public bucket**: ✅ Yes (toggle on)
- **File size limit**: 10 MB
- **Allowed MIME types**: 
  ```
  image/jpeg
  image/png
  image/webp
  image/heic
  image/heif
  ```

##### Bucket 3: `original-recipe-cards`
- **Name**: `original-recipe-cards`
- **Public bucket**: ❌ No (toggle off)
- **File size limit**: 10 MB
- **Allowed MIME types**: 
  ```
  image/jpeg
  image/png
  image/webp
  image/heic
  image/heif
  ```

#### Step 2: Set up RLS (Row Level Security) policies

For each bucket, you need to create RLS policies to control access:

1. After creating a bucket, click on it to view details
2. Click on **Policies** tab
3. Click **New policy** and select **For full customization**
4. Create these four policies for each bucket:

##### Policy 1: Allow authenticated uploads
- **Policy name**: `Allow authenticated uploads`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```
- **Operations**: INSERT

##### Policy 2: Allow public downloads (for public buckets only)
- **Policy name**: `Allow public downloads`
- **Target roles**: `anon, authenticated`
- **USING expression**:
  ```sql
  true
  ```
- **Operations**: SELECT

For the `original-recipe-cards` bucket (private), use this instead:
- **Policy name**: `Allow authenticated downloads`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```
- **Operations**: SELECT

##### Policy 3: Allow users to update their own files
- **Policy name**: `Allow users to update own files`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```
- **WITH CHECK expression**:
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```
- **Operations**: UPDATE

##### Policy 4: Allow users to delete their own files
- **Policy name**: `Allow users to delete own files`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```
- **Operations**: DELETE

> **Important**: The file path structure must be `{user-id}/{filename}` for the RLS policies to work correctly. The policies check that the first folder in the path matches the authenticated user's ID.

#### Step 3: Verify setup

After creating all buckets and policies, verify everything is set up correctly:

```bash
pnpm storage:check
```

This command will check if all required buckets exist and provide feedback.

#### Alternative: Automated setup

If you have a Supabase service role key, you can automate bucket creation:

1. Add to your `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Run:
   ```bash
   pnpm storage:setup
   ```

> **Note**: The automated setup creates buckets but you'll still need to manually create RLS policies through the dashboard.

### 5. Run database migrations

```bash
pnpm db:migrate
```

### 6. Start the development server

```bash
pnpm dev
```

The app will be available at [http://localhost:3002](http://localhost:3002)

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm dev:safe` - Start development server with auto-recovery from build errors
- `pnpm dev:clean` - Clean build cache and start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests
- `pnpm test:ui` - Run tests with UI
- `pnpm test:coverage` - Run tests with coverage

### Database Commands

- `pnpm db:generate` - Generate migrations from schema
- `pnpm db:migrate` - Run migrations
- `pnpm db:push` - Push schema changes directly (dev only)
- `pnpm db:studio` - Open Drizzle Studio

### Utility Commands

- `pnpm env:check` - Validate environment variables
- `pnpm storage:check` - Check storage bucket setup
- `pnpm storage:setup` - Set up storage buckets (requires service role key)
- `pnpm storage:policies` - Display RLS policy setup instructions

## Project Structure

```
recipe-keeper/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Auth pages
│   └── protected/         # Protected routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── recipe/           # Recipe-specific components
├── lib/                   # Utilities and configurations
│   ├── db/               # Database schema and queries
│   └── supabase/         # Supabase clients
├── drizzle/              # Database migrations
└── scripts/              # Utility scripts
```

## Testing

Run the test suite:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

## Troubleshooting

### Storage Upload Errors

#### "Bucket not found" (404 error)
- Run `pnpm storage:check` to verify buckets exist
- Follow the setup instructions in Step 3 above to create missing buckets

#### "new row violates row-level security policy" (403 error)
- This means the RLS policies are not configured correctly
- Run `pnpm storage:policies` to see the exact policy configurations needed
- Make sure you've created all 4 policies for each bucket (INSERT, SELECT, UPDATE, DELETE)
- Verify the file path follows the format: `{user-id}/{filename}`
- The policies check that the first folder matches the authenticated user's ID

### Voice Feature Issues

#### "Voice transcription is not configured"
- This error appears when the `OPENAI_API_KEY` is not set in production
- To enable voice transcription:
  1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
  2. Add `OPENAI_API_KEY=your-key` to your environment variables
  3. Redeploy your application
- Without this key, voice features will only work for the demo account

#### Voice recording not working
- Check that your browser supports the Web Audio API
- Make sure you've granted microphone permissions to the site
- Try using Chrome or Edge for best compatibility

### Development Server Issues

#### "ENOENT: no such file or directory" errors with _buildManifest.js
This is a known issue with Next.js dev server when files change frequently. To fix:

1. **Use the safe development mode:**
   ```bash
   pnpm dev:safe
   ```
   This script automatically restarts the server if build manifest errors occur.

2. **Or clean the build cache:**
   ```bash
   pnpm dev:clean
   ```
   This removes the `.next` directory and starts fresh.

3. **If the issue persists:**
   - Stop the dev server (Ctrl+C)
   - Run `rm -rf .next`
   - Start the dev server again with `pnpm dev`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Demo Account

For testing purposes:
- Email: demo@recipekeeper.com
- Password: DemoRecipes2024!