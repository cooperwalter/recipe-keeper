// Build information utilities
import { readFileSync } from 'fs';
import { join } from 'path';

export function getBuildId(): string {
  try {
    // In production, Next.js stores the build ID in a file
    if (process.env.NODE_ENV === 'production') {
      const buildIdPath = join(process.cwd(), '.next', 'BUILD_ID');
      return readFileSync(buildIdPath, 'utf8').trim();
    }
  } catch {
    // Fallback to environment variables
  }
  
  // Development or fallback
  return process.env.BUILD_ID || 
         process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || 
         'development';
}

export function getBuildTime(): string {
  // This will be set at build time
  return process.env.BUILD_TIME || new Date().toISOString();
}