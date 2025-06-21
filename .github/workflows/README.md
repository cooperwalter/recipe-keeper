# GitHub Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### CI (`ci.yml`)
Runs on every push and pull request to ensure code quality:
- **Lint**: Runs ESLint and TypeScript type checking
- **Test**: Runs unit and API tests
- **Build**: Builds the Next.js application
- **E2E**: Runs Playwright end-to-end tests
- **Security**: Runs Trivy vulnerability scanner
- **Dependency Check**: Checks for outdated and vulnerable dependencies

### Deploy Preview (`deploy-preview.yml`)
Automatically deploys pull requests to Vercel preview environments:
- Builds and deploys to a unique preview URL
- Comments on the PR with the preview link
- Helps reviewers test changes before merging

### Deploy Production (`deploy-production.yml`)
Deploys to production when code is pushed to the main branch:
- Runs full test suite before deployment
- Deploys to Vercel production environment
- Runs database migrations
- Creates a GitHub release

### CodeQL Analysis (`codeql.yml`)
Performs automated security analysis:
- Scans for security vulnerabilities
- Runs on push, PR, and weekly schedule
- Analyzes JavaScript and TypeScript code
- Reports findings to GitHub Security tab

### Database Backup (`database-backup.yml`)
Automated daily database backups:
- Runs daily at 2 AM UTC
- Creates PostgreSQL dumps
- Uploads to S3 with 30-day retention
- Creates GitHub issue on failure

### Dependabot (`dependabot.yml`)
Automated dependency updates:
- Weekly checks for npm package updates
- Groups development dependencies
- Auto-updates patch versions for production deps
- Updates GitHub Actions versions

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Application Secrets
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `ANTHROPIC_API_KEY`: Anthropic API key for AI features
- `OPENAI_API_KEY`: OpenAI API key for voice transcription
- `DATABASE_URL`: PostgreSQL connection string

### Deployment Secrets
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

### Backup Secrets (Optional)
- `AWS_ACCESS_KEY_ID`: AWS access key for S3
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region for S3 bucket
- `S3_BACKUP_BUCKET`: S3 bucket name for backups

## Local Testing

To test workflows locally, you can use [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Run CI workflow
act push

# Run specific job
act -j lint
```

## Workflow Status Badges

Add these badges to your README.md:

```markdown
[![CI](https://github.com/cooperwalter/recipe-keeper/actions/workflows/ci.yml/badge.svg)](https://github.com/cooperwalter/recipe-keeper/actions/workflows/ci.yml)
[![CodeQL](https://github.com/cooperwalter/recipe-keeper/actions/workflows/codeql.yml/badge.svg)](https://github.com/cooperwalter/recipe-keeper/actions/workflows/codeql.yml)
```