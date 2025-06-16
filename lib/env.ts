import { z } from 'zod';

// Check if we're in production before defining schema
const isProduction = process.env.NODE_ENV === 'production';

// Define the schema for our environment variables
const envSchema = z.object({
  // Required Supabase variables
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  
  // Required for database operations
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // Required for OCR functionality
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  
  // Required in production for voice transcription
  OPENAI_API_KEY: isProduction 
    ? z.string().min(1, "OPENAI_API_KEY is required in production for voice transcription features")
    : z.string().optional(),
  
  // Optional variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

// Type for our validated environment
export type Env = z.infer<typeof envSchema>;

// Validate environment variables
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      console.error('❌ Missing or invalid environment variables:', missingVars);
      console.error('\nPlease check your .env.local file and ensure all required variables are set.');
      console.error('See .env.example for the required variables.\n');
      
      // In development, show detailed errors
      if (process.env.NODE_ENV === 'development') {
        error.errors.forEach(err => {
          console.error(`  ${err.path.join('.')}: ${err.message}`);
        });
      }
      
      throw new Error(`Missing required environment variables: ${missingVars}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Re-export helper to check if we're in production
export { isProduction };

// Helper to check if we're in development
export const isDevelopment = process.env.NODE_ENV === 'development';