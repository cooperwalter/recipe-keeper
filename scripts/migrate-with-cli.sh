#!/bin/bash

# Migration runner using Supabase CLI
# This script ensures migrations are only applied once and in order

set -e

echo "🔄 Running database migrations..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "⚠️  No supabase/config.toml found. Initializing Supabase..."
    supabase init
fi

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check migration status
echo "📋 Checking migration status..."
supabase db migrations list

# Apply migrations
echo "📤 Applying pending migrations..."
supabase db push

# Verify migrations
echo "✅ Verifying migrations..."
supabase db migrations list

echo "✨ Migrations complete!"