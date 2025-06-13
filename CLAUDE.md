# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Recipe Inheritance Keeper** - A family recipe preservation platform that captures, digitizes, and shares cherished family recipes across generations. Built with Next.js and Supabase to create a beautiful digital cookbook from various sources including handwritten cards, photos, and voice recordings.

### MVP Features

#### Recipe Capture
- **Smart OCR**: Advanced text extraction from photos and screenshots with handwriting recognition
- **Multiple Image Formats**: Support for photos (camera/gallery) and screenshots
- **Duplicate Detection**: Automatically detect if uploaded image matches existing recipe and prompt to update
- **Manual Entry**: Simple form for typing in recipes directly
- **Measurement Standardization**: Convert common measurements and abbreviations

#### Recipe Storage
- **Recipe Fields**: Title, ingredients, instructions, prep/cook time, servings
- **Photo Attachment**: Add photos of the finished dish and original recipe card
- **Story Note**: Text field for "Family notes & memories"
- **Source Attribution**: Who contributed the recipe and when
- **Version History**: Track all changes with ability to view/restore previous versions

#### Organization
- **Basic Categories**: Main dish, side, dessert, etc.
- **Simple Search**: Find recipes by name or ingredient
- **Favorites**: Mark family favorites with a star
- **Basic Tags**: Add simple tags like "Holiday" or "Grandma's"

#### Core Tools
- **Scaling Calculator**: Adjust recipe servings with automatic ingredient recalculation
- **Measurement Converter**: Switch between metric and imperial
- **Shopping List**: Generate ingredient list from scaled recipe

#### Sharing & Export
- **Read-Only Links**: Generate shareable links for individual recipes
- **PDF Export**: Download individual recipes as printable cards
- **Basic Cookbook Export**: Generate a simple PDF cookbook of all recipes
- **Print View**: Clean, printer-friendly layout

#### Core Preservation
- **Cloud Backup**: Automatic backup of all recipes
- **Original Preservation**: Keep image of original recipe card alongside digital version
- **Change Tracking**: See who modified what and when with full version comparison

#### Simple UI
- **Recipe Browse**: Grid or list view of all recipes
- **Recipe View**: Clean display optimized for cooking (mobile-friendly)
- **Add/Update Wizard**: Guided process for adding new or updating existing recipes
- **Cooking Mode**: Distraction-free view with larger text for active cooking

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Auth**: Supabase Auth (configured)
- **UI**: Tailwind CSS + shadcn/ui components
- **Package Manager**: pnpm

### Key Directories
- `/app` - Next.js App Router pages and layouts
  - `/auth` - Authentication pages (login, signup, etc.)
  - `/protected` - Routes requiring authentication
- `/components` - React components
  - `/ui` - shadcn/ui components library
- `/lib` - Utilities and configurations
  - `/supabase` - Client configurations for server/client/middleware

### Important Files
- `middleware.ts` - Handles auth session refresh
- `components.json` - shadcn/ui configuration
- Path alias: `@/*` maps to project root

## Environment Setup

Required environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Development Guidelines

### Component Development
- Use shadcn/ui components from `/components/ui`
- Follow existing component patterns
- Components use Radix UI primitives

### Styling
- Use Tailwind CSS classes
- Dark mode supported via `dark:` prefix
- CSS variables defined in `app/globals.css`

### Authentication
- Auth flows already implemented in `/app/auth`
- Use Supabase client from `/lib/supabase`
- Protected routes use middleware for session management

## Claude Memories

- Always reference the project roadmap (PROJECT_ROADMAP.md) when completing any task