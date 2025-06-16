# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Recipe Inheritance Keeper** - A family recipe preservation platform that captures, digitizes, and shares cherished family recipes across generations. Built with Next.js and Supabase to create a beautiful digital cookbook from various sources including handwritten cards, photos, and voice recordings.

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server with Turbopack (port 3002)
pnpm dev

# Build for production (runs migrations automatically)
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit      # Unit tests only
pnpm test:api       # API tests only
pnpm test:e2e       # E2E tests only
pnpm test:ui        # Tests with UI
pnpm test:coverage  # Tests with coverage report

# Database commands
pnpm db:generate    # Generate migrations from schema changes
pnpm db:migrate     # Apply pending migrations
pnpm db:push        # Push schema changes directly (dev only)
pnpm db:studio      # Open Drizzle Studio for database inspection
pnpm db:status      # Check migration status

# Storage setup
pnpm storage:check    # Verify storage buckets exist
pnpm storage:setup    # Create storage buckets (requires service role key)
pnpm storage:policies # Display RLS policy setup instructions

# Utility commands
pnpm env:check # Validate environment variables
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript with strict mode enabled
- **Database**: PostgreSQL via Supabase with Drizzle ORM
- **Auth**: Supabase Auth with middleware session refresh
- **Storage**: Supabase Storage for recipe photos and OCR uploads
- **AI/OCR**: Anthropic Claude API for text extraction and voice features
- **UI**: Tailwind CSS + shadcn/ui components
- **Testing**: Vitest + React Testing Library
- **Package Manager**: pnpm

### Key Directories
- `/app` - Next.js App Router pages and layouts
  - `/api` - API routes (recipes, categories, transcribe, auth)
  - `/auth` - Authentication pages (login, signup, etc.)
  - `/protected` - Routes requiring authentication
- `/components` - React components
  - `/ui` - shadcn/ui components library
  - `/recipes` - Recipe-specific components (forms, cards, grids)
  - `/recipe` - Individual recipe components (voice flow, OCR)
- `/lib` - Utilities and configurations
  - `/db` - Database schema (Drizzle) and migrations
  - `/supabase` - Client configurations for server/client/middleware
  - `/services` - Business logic (RecipeService)
- `/drizzle` - Database migrations directory
- `/scripts` - Utility scripts for migrations and setup
- `/test` - Test setup and mocks

### Database Schema (Drizzle ORM)
Main tables:
- `recipes` - Core recipe data
- `ingredients` - Recipe ingredients with amounts
- `instructions` - Step-by-step instructions
- `recipe_photos` - Photo attachments
- `categories` - Recipe categories
- `tags` - Recipe tags
- `recipe_versions` - Version history (JSONB snapshots)
- `favorites` - User favorites

All tables include RLS policies and proper indexes.

### Authentication Flow
- Middleware (`middleware.ts`) handles session refresh
- Auth pages in `/app/auth` for login/signup flows
- Protected routes under `/app/protected`
- Supabase clients in `/lib/supabase` for different contexts (server/client/middleware)

## Testing Strategy

The project uses Vitest with separate configs for different test types:
- **Unit tests** (`vitest.config.unit.ts`) - Component and utility testing
- **API tests** (`vitest.config.api.ts`) - API route testing
- **E2E tests** (`vitest.config.e2e.ts`) - Full user flow testing

Test files use `.test.ts` or `.test.tsx` extensions and are located alongside the code they test.

## AI Features

### OCR Recipe Capture
- Uses Anthropic Claude Vision API for text extraction
- Endpoint: `/api/recipes/ocr`
- Supports handwriting recognition
- Returns structured recipe data from images

### Voice-to-Recipe
- Voice recording and transcription
- Natural language processing for recipe modifications
- Endpoints under `/api/recipes/voice/`
- Components in `/components/recipe/voice-*`

## Development Guidelines

### Component Development
- Use shadcn/ui components from `/components/ui`
- Follow existing patterns for forms and data display
- Components use Radix UI primitives
- Keep components focused and testable

### API Development
- RESTful routes under `/app/api/`
- Use service layer pattern (see `RecipeService`)
- Implement proper error handling and validation
- Return consistent response formats

### Database Changes
1. Modify schema in `/lib/db/schema/`
2. Generate migration: `pnpm db:generate`
3. Review generated migration in `/drizzle/`
4. Apply migration: `pnpm db:migrate`
5. Update TypeScript types automatically generated

### Testing Requirements
- Write tests for all new features
- Maintain existing test coverage
- Run tests before committing: `pnpm test`
- Fix any failing tests immediately

## Environment Setup

Required environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
DATABASE_URL=<postgresql-connection-string>
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

Optional:
```
NEXT_PUBLIC_SITE_URL=<production-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Common Development Tasks

### Adding a New Recipe Feature
1. Update database schema if needed
2. Generate and run migrations
3. Create/update API routes
4. Build UI components
5. Write comprehensive tests
6. Update documentation

### Debugging Storage Issues
1. Run `pnpm storage:check` to verify setup
2. Check RLS policies match expected format
3. Ensure file paths follow `{user-id}/{filename}` structure
4. Verify authentication is working correctly

### Working with Versions
- Recipe versions stored as JSONB in `recipe_versions` table
- Automatic version creation on recipe updates
- Full recipe snapshot preserved for each version
- UI for version comparison and restore planned

## Important Notes

- Always reference PROJECT_ROADMAP.md for feature status
- Run `pnpm test` after making changes
- Update tests when modifying existing code
- Follow existing code patterns and conventions
- Never commit sensitive data or API keys
- Path alias `@/*` maps to project root