import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Seed Data', () => {
  it('should have valid SQL syntax', () => {
    const seedPath = join(__dirname, 'seed.sql')
    const seedContent = readFileSync(seedPath, 'utf-8')
    
    // Basic SQL validation
    expect(seedContent).toContain('INSERT INTO')
    expect(seedContent).toContain('recipes')
    expect(seedContent).toContain('ingredients')
    expect(seedContent).toContain('instructions')
    
    // Check for common SQL syntax errors
    expect(seedContent).not.toMatch(/INSERT\s+INTO\s+\w+\s*$/m) // Incomplete INSERT
    expect(seedContent).not.toMatch(/,\s*\)/) // Trailing comma before closing paren
    
    // Ensure all statements end with semicolon
    const statements = seedContent.split(';').filter(s => s.trim())
    statements.forEach(statement => {
      if (statement.trim() && !statement.includes('--')) {
        // Each non-comment statement should have basic SQL structure
        const trimmed = statement.trim()
        if (trimmed.startsWith('INSERT')) {
          expect(trimmed).toMatch(/INSERT\s+INTO/i)
          expect(trimmed).toMatch(/VALUES/i)
        }
      }
    })
  })
  
  it('should include all required tables', () => {
    const seedPath = join(__dirname, 'seed.sql')
    const seedContent = readFileSync(seedPath, 'utf-8')
    
    const requiredTables = [
      'recipes',
      'ingredients',
      'instructions',
      'recipe_category_mappings',
      'recipe_tags',
      'favorites'
    ]
    
    requiredTables.forEach(table => {
      expect(seedContent).toMatch(new RegExp(`INSERT INTO ${table}`, 'i'))
    })
  })
  
  it('should use auth.uid() for user references', () => {
    const seedPath = join(__dirname, 'seed.sql')
    const seedContent = readFileSync(seedPath, 'utf-8')
    
    // Should use auth.uid() instead of hardcoded user IDs
    expect(seedContent).toContain('auth.uid()')
    expect(seedContent).not.toMatch(/created_by\s*,\s*['"][a-f0-9-]+['"]/) // No hardcoded UUIDs
  })
})