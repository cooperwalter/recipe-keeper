# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Recipe Inheritance Keeper** - A family recipe preservation platform that captures, digitizes, and shares cherished family recipes across generations. Built with Next.js and Supabase to create a beautiful digital cookbook from various sources including handwritten cards, photos, and voice recordings.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (auto-recovers from ENOENT errors)
pnpm dev              # Smart dev server with auto-recovery and port management
pnpm dev:basic        # Basic Next.js dev without recovery
pnpm dev:clean-start  # Cleans cache once at start
pnpm kill-port        # Kill processes on port 3002

# Database commands
pnpm db:generate      # Generate new migration from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:studio        # Open Drizzle Studio for database exploration
pnpm db:status        # Check migration status
pnpm db:push          # Push schema changes directly (dev only)
pnpm db:mark-applied  # Mark migrations as applied without running

# Testing
pnpm test            # Run all tests (292+ passing)
pnpm test:unit       # Unit tests only
pnpm test:api        # API tests only
pnpm test:e2e        # E2E tests only (not fully implemented)
pnpm test:coverage   # Generate coverage report
pnpm test:ui         # Run tests with Vitest UI

# Build & Production
pnpm build           # Build for production (runs migrations)
pnpm build:ci        # CI-specific build command
pnpm start           # Start production server
pnpm lint            # Run ESLint

# Storage & Environment
pnpm storage:setup   # Create Supabase storage buckets
pnpm storage:check   # Verify bucket setup
pnpm storage:policies # Fix storage policies
pnpm env:check       # Validate environment variables
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Auth**: Supabase Auth with middleware session refresh
- **UI**: Tailwind CSS + shadcn/ui components
- **AI**: Anthropic Claude (OCR/NLP) + OpenAI (voice transcription)

### Key Directories
- `/app` - Next.js App Router pages
  - `/api` - API routes with service layer pattern
  - `/auth` - Authentication flows
  - `/protected` - Authenticated routes
- `/components` - React components
  - `/ui` - shadcn/ui component library
  - `/recipe` - Recipe-specific components
- `/lib` - Core utilities
  - `/db` - Database schema and client
  - `/services` - Business logic layer
  - `/supabase` - Auth clients (server/client/middleware)
  - `/ai` - AI service integrations
- `/scripts` - Development and migration tools (30+ scripts)
- `/drizzle` - Database migrations directory
- `/__tests__` - Comprehensive test suite with mocks

### Database Schema (Drizzle ORM)
- **recipes** - Core recipe data with soft delete
- **ingredients** - Normalized with decimal amounts
- **instructions** - Step-by-step with ordering
- **recipe_photos** - Multiple photos with original flag
- **recipe_versions** - Complete JSONB snapshots for full history
- **favorites**, **recipe_tags**, **recipe_categories** - User features
- **schema_migrations** - Track applied migrations

### Authentication Pattern
1. Middleware (`middleware.ts`) refreshes sessions on every request
2. Server components use `createClient()` from `/lib/supabase/server.ts`
3. Client components use `createBrowserClient()` from `/lib/supabase/client.ts`
4. API routes check auth via `getUser()` before processing
5. Demo account support with special handling

### Service Layer Pattern
API routes delegate to services (e.g., `RecipeService`) which handle:
- Database operations via Drizzle ORM
- Business logic and validation
- Consistent error handling
- Transaction management
- Supabase client context for auth

Example:
```typescript
const recipeService = new RecipeService(supabase);
const recipes = await recipeService.getRecipes(userId);
```

### AI Integration
- **OCR**: Claude Vision API via `@ai-sdk/anthropic` and Vercel AI SDK
  - Structured extraction with Zod schemas
  - Confidence scoring for extractions
  - Support for handwritten text
- **Voice**: OpenAI Whisper for transcription
  - Required in production (OPENAI_API_KEY)
  - Falls back to mock transcription in development
  - Real-time transcription display
  - Natural language processing for recipe updates
- **Pattern**: Centralized clients with structured generation and error handling

### Storage Structure
Supabase Storage buckets:
- `recipe-photos` - Finished dish photos
- `ocr-uploads` - Temporary OCR processing
- `original-recipe-cards` - Preserved originals

Files stored as: `{user-id}/{filename}` with RLS policies

## Testing Approach
- **Unit Tests**: Components and utilities with React Testing Library
- **API Tests**: Full route testing with mocked Supabase
- **E2E Tests**: Critical user flows (Playwright configured but not implemented)
- **Mocking**: Comprehensive Supabase client mocks in `__tests__/__mocks__`
- **Environment**: Vitest with Happy DOM for components

## Important Patterns

### Development Server
The custom dev server includes:
- Auto-recovery from build errors
- Port management (kills existing processes)
- Automatic restart on crashes
- Turbopack integration for faster builds

### Error Handling
- User-friendly error messages
- Consistent API response format
- Graceful fallbacks for AI features
- Demo mode support

### Type Safety
- Drizzle ORM generates types from schema
- Strict TypeScript configuration
- Zod validation for API inputs
- Type-safe environment variables

## Environment Variables
Required in production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (for voice features)
- `ANTHROPIC_API_KEY` (for OCR/NLP)

Optional:
- `SUPABASE_SERVICE_ROLE_KEY` (admin operations)
- `NEXT_PUBLIC_SITE_URL` (production email redirects)

## Important Notes
- Always use Drizzle ORM for database operations (not raw SQL)
- Follow existing service layer patterns for consistency
- Run `pnpm lint` before committing
- Voice features require OPENAI_API_KEY in production
- Database URL must use connection pooler for production
- Test coverage goal: 80%+ for new features
- Custom dev server handles common development issues automatically

## Known Limitations
- No full E2E browser automation tests yet
- Tags feature backend ready but UI not implemented
- No performance monitoring (Sentry) configured
- Missing API rate limiting
- No visual regression testing

## Memories
- Whenever the "project roadmap", "roadmap", or similar, is referred to, this means the PROJECT_ROADMAP.md document in the project root.
- Only commit and push changes to the dev branch. If not on the dev branch, do nothing