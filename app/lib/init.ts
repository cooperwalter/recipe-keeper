// This file is imported early in the application to validate environment variables
import { env } from '@/lib/env';

// Validate environment variables on import
if (typeof window === 'undefined') {
  // Only run on server-side
  console.log('✅ Environment variables validated successfully');
  
  // Log which environment we're running in
  console.log(`🚀 Running in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Optionally log non-sensitive configuration
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Configuration:');
    console.log(`  - Supabase URL: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`  - Database URL: ${env.DATABASE_URL.replace(/:[^@]+@/, ':****@')}`); // Hide password
    console.log(`  - Anthropic API: ${env.ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`  - OpenAI API: ${env.OPENAI_API_KEY ? '✓ Configured' : '✗ Missing (voice features disabled)'}`);
  }
}