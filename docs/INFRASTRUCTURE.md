# Infrastructure Documentation

## Overview

This document outlines the infrastructure, services, and technical stack used by the Recipe Inheritance Keeper application.

## Core Infrastructure

### Hosting & Deployment
- **Platform**: Vercel (presumed based on Next.js and @vercel/analytics usage)
- **Framework**: Next.js 15.3.3 with App Router
- **Runtime**: Node.js
- **Package Manager**: pnpm

### Database
- **Provider**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Migration Tool**: Drizzle Kit
- **Connection**: Supabase client libraries (@supabase/supabase-js, @supabase/ssr)

### Authentication
- **Provider**: Supabase Auth
- **Implementation**: 
  - Server-side session management via middleware
  - Secure cookie-based sessions
  - Email/password authentication
  - Magic link support

### Storage
- **Provider**: Supabase Storage
- **Buckets**:
  - `recipe-photos`: Finished dish photos
  - `ocr-uploads`: Temporary OCR processing files
  - `original-recipe-cards`: Preserved original recipe cards
- **Structure**: Files stored as `{user-id}/{filename}` with RLS policies

## External Services

### Email
- **Provider**: MailerSend
- **Usage**: 
  - User authentication emails
  - Password reset emails
  - Account verification

### AI/ML Services
- **Anthropic Claude API**
  - OCR (Optical Character Recognition) for recipe cards
  - Natural language processing for recipe modifications
  - Recipe content extraction from images
  
- **OpenAI API**
  - Whisper for voice transcription
  - Voice-to-recipe conversion

### Analytics & Monitoring
- **Analytics**: Vercel Analytics
- **Error Tracking**: (To be configured)
- **Performance Monitoring**: Next.js built-in metrics

## Development Infrastructure

### Version Control
- **Platform**: GitHub
- **Branching Strategy**: Main branch for production
- **CI/CD**: Automated deployments via Vercel

### Development Tools
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js configuration
- **Testing**:
  - Jest for unit tests
  - React Testing Library for component tests
  - API route testing with mocked Supabase
  - E2E testing setup

### Build Configuration
- **Build Tool**: Next.js built-in with Webpack
- **Optimizations**:
  - Image optimization with Next.js Image component
  - Code splitting and lazy loading
  - Static generation where possible
  - ISR (Incremental Static Regeneration) capability

## Environment Variables

### Required for Production
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Email Service
MAILERSEND_API_KEY=
MAILERSEND_FROM_EMAIL=
MAILERSEND_FROM_NAME=

# Application
NEXT_PUBLIC_APP_URL=
```

### Optional/Development
```env
# Development
NEXT_PUBLIC_MOCK_AI=true  # Use AI mocks in development
```

## Security Considerations

### Authentication & Authorization
- Row Level Security (RLS) policies on all database tables
- Middleware-based session refresh on every request
- Secure HTTP-only cookies for session management
- CSRF protection built into Next.js

### Data Protection
- All user data isolated by user ID
- File uploads scoped to authenticated users
- API routes protected by authentication checks
- Environment variables for sensitive configuration

### Content Security
- Image domains restricted in Next.js config
- CORS headers configured appropriately
- XSS protection via React's built-in escaping

## Performance Optimizations

### Caching
- Next.js automatic static optimization
- Database query caching via React Query
- Image optimization and caching
- Build-time static generation where possible

### Bundle Optimization
- Code splitting by route
- Dynamic imports for heavy components
- Tree shaking enabled
- Vendor chunk optimization

## Scalability Considerations

### Database
- Connection pooling via Supabase
- Indexed columns for common queries
- Optimized query patterns with Drizzle ORM

### Application
- Serverless functions for API routes
- Edge middleware for authentication
- Static generation for marketing pages
- ISR for recipe pages

## Monitoring & Maintenance

### Health Checks
- `/api/health` endpoint for uptime monitoring
- Database connection health checks
- External service availability checks

### Backup Strategy
- Automated database backups via Supabase
- Version history for recipes stored in database
- User-uploaded files persisted in Supabase Storage

### Update Strategy
- Dependency updates via Renovate/Dependabot
- Database migrations versioned and tested
- Staged rollouts when possible

## Cost Considerations

### Fixed Costs
- Domain registration and DNS
- SSL certificates (included with Vercel)

### Usage-Based Costs
- Supabase (database, auth, storage)
- Vercel hosting (bandwidth, compute)
- AI API usage (Anthropic, OpenAI)
- Email sending (MailerSend)

## Disaster Recovery

### Backup Procedures
- Daily automated database backups
- Point-in-time recovery available
- Recipe version history as built-in backup

### Recovery Time Objectives
- RTO: < 4 hours
- RPO: < 24 hours

### Incident Response
- Monitoring alerts configured
- On-call rotation (if applicable)
- Runbook documentation maintained

## Future Infrastructure Considerations

### Potential Enhancements
- CDN for static assets
- Redis for session/cache storage
- Search infrastructure (Elasticsearch/Algolia)
- Real-time features via WebSockets
- Mobile app infrastructure

### Scaling Preparations
- Database read replicas
- Horizontal scaling capability
- Queue system for background jobs
- Rate limiting implementation