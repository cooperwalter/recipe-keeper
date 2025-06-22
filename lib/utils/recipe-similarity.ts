/**
 * Recipe similarity detection utilities
 * 
 * This module provides functionality to detect similar or duplicate recipes
 * based on various factors including title, ingredients, and instructions.
 */

import type { RecipeWithRelations, Ingredient } from '@/lib/types/recipe'

/**
 * Similarity score breakdown
 */
export interface SimilarityScore {
  overall: number // 0-1 score
  titleSimilarity: number
  ingredientSimilarity: number
  instructionSimilarity: number
  servingsSimilarity: number
  timeSimilarity: number
}

/**
 * Recipe match result
 */
export interface RecipeMatch {
  recipe: RecipeWithRelations
  score: SimilarityScore
  isDuplicate: boolean // true if score > duplicate threshold
}

// Thresholds for similarity detection
const DUPLICATE_THRESHOLD = 0.85 // Above this is considered a duplicate
const SIMILAR_THRESHOLD = 0.60 // Above this is considered similar

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy string matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1
  
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1
  
  const distance = levenshteinDistance(s1, s2)
  return 1 - (distance / maxLen)
}

/**
 * Normalize ingredient for comparison
 */
function normalizeIngredient(ingredient: string): string {
  return ingredient
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Calculate ingredient list similarity
 * Uses Jaccard similarity with fuzzy matching
 */
function calculateIngredientSimilarity(ingredients1: Ingredient[], ingredients2: Ingredient[]): number {
  // Handle empty lists
  if (!ingredients1.length && !ingredients2.length) return 1 // Both empty = identical
  if (!ingredients1.length || !ingredients2.length) return 0 // One empty = no similarity
  
  // Normalize and extract ingredient names
  const set1 = ingredients1.map(ing => normalizeIngredient(ing.ingredient))
  const set2 = ingredients2.map(ing => normalizeIngredient(ing.ingredient))
  
  // Remove empty strings after normalization
  const cleanSet1 = set1.filter(ing => ing.length > 0)
  const cleanSet2 = set2.filter(ing => ing.length > 0)
  
  // If both are empty after cleaning, they're identical
  if (cleanSet1.length === 0 && cleanSet2.length === 0) return 1
  if (cleanSet1.length === 0 || cleanSet2.length === 0) return 0
  
  // Count fuzzy matches
  let matches = 0
  const matched2 = new Set<number>()
  
  for (const ing1 of cleanSet1) {
    let bestMatch = 0
    let bestMatchIndex = -1
    
    for (let i = 0; i < cleanSet2.length; i++) {
      if (matched2.has(i)) continue
      
      const similarity = stringSimilarity(ing1, cleanSet2[i])
      if (similarity > bestMatch && similarity > 0.8) { // 80% threshold for ingredient match
        bestMatch = similarity
        bestMatchIndex = i
      }
    }
    
    if (bestMatchIndex !== -1) {
      matches++
      matched2.add(bestMatchIndex)
    }
  }
  
  // Jaccard similarity: intersection / union
  // Note: matches represents the size of the intersection
  // Union = |A| + |B| - |A ∩ B|
  const union = cleanSet1.length + cleanSet2.length - matches
  return union > 0 ? matches / union : 0
}

/**
 * Calculate instruction similarity
 * Compares the overall instruction text
 */
function calculateInstructionSimilarity(
  instructions1: Array<{ instruction: string }>,
  instructions2: Array<{ instruction: string }>
): number {
  // Handle empty instruction lists
  if (!instructions1.length && !instructions2.length) return 1 // Both empty = identical
  if (!instructions1.length || !instructions2.length) return 0 // One empty = no similarity
  
  // Concatenate all instructions
  const text1 = instructions1.map(i => i.instruction).join(' ').toLowerCase()
  const text2 = instructions2.map(i => i.instruction).join(' ').toLowerCase()
  
  // Handle empty instruction text
  if (!text1.trim() && !text2.trim()) return 1
  if (!text1.trim() || !text2.trim()) return 0
  
  // Use word-based similarity for longer texts
  const words1 = text1.split(/\s+/).filter(w => w.length > 2) // Ignore short words
  const words2 = text2.split(/\s+/).filter(w => w.length > 2)
  
  // If no significant words, fall back to basic string similarity
  if (!words1.length && !words2.length) return 1
  if (!words1.length || !words2.length) return stringSimilarity(text1, text2) * 0.5 // Reduced weight for short text
  
  // Count common words
  const wordSet1 = new Set(words1)
  const wordSet2 = new Set(words2)
  const intersection = new Set([...wordSet1].filter(w => wordSet2.has(w)))
  
  // Jaccard similarity
  const union = wordSet1.size + wordSet2.size - intersection.size
  return union > 0 ? intersection.size / union : 0
}

/**
 * Calculate numeric similarity (for servings, time)
 */
function numericSimilarity(n1: number | undefined, n2: number | undefined): number {
  if (n1 === undefined || n2 === undefined) return 0.5 // Unknown similarity
  if (n1 === n2) return 1
  
  const diff = Math.abs(n1 - n2)
  const avg = (n1 + n2) / 2
  
  // Use relative difference
  return Math.max(0, 1 - (diff / avg))
}

/**
 * Calculate overall recipe similarity
 */
export function calculateRecipeSimilarity(
  recipe1: RecipeWithRelations,
  recipe2: RecipeWithRelations
): SimilarityScore {
  // Title similarity (40% weight)
  const titleSimilarity = stringSimilarity(recipe1.title, recipe2.title)
  
  // Ingredient similarity (30% weight)
  const ingredientSimilarity = calculateIngredientSimilarity(
    recipe1.ingredients,
    recipe2.ingredients
  )
  
  // Instruction similarity (20% weight)
  const instructionSimilarity = calculateInstructionSimilarity(
    recipe1.instructions,
    recipe2.instructions
  )
  
  // Servings similarity (5% weight)
  const servingsSimilarity = numericSimilarity(recipe1.servings, recipe2.servings)
  
  // Time similarity (5% weight)
  const totalTime1 = (recipe1.prepTime || 0) + (recipe1.cookTime || 0)
  const totalTime2 = (recipe2.prepTime || 0) + (recipe2.cookTime || 0)
  const timeSimilarity = totalTime1 > 0 && totalTime2 > 0
    ? numericSimilarity(totalTime1, totalTime2)
    : 0.5
  
  // Calculate weighted overall score
  const overall = (
    titleSimilarity * 0.4 +
    ingredientSimilarity * 0.3 +
    instructionSimilarity * 0.2 +
    servingsSimilarity * 0.05 +
    timeSimilarity * 0.05
  )
  
  return {
    overall,
    titleSimilarity,
    ingredientSimilarity,
    instructionSimilarity,
    servingsSimilarity,
    timeSimilarity
  }
}

/**
 * Find similar recipes in a list
 */
export function findSimilarRecipes(
  targetRecipe: RecipeWithRelations,
  recipes: RecipeWithRelations[],
  options: {
    includeTarget?: boolean
    minScore?: number
  } = {}
): RecipeMatch[] {
  const { includeTarget = false, minScore = SIMILAR_THRESHOLD } = options
  
  const matches: RecipeMatch[] = []
  
  for (const recipe of recipes) {
    // Skip the target recipe unless requested
    if (!includeTarget && recipe.id === targetRecipe.id) continue
    
    const score = calculateRecipeSimilarity(targetRecipe, recipe)
    
    if (score.overall >= minScore) {
      matches.push({
        recipe,
        score,
        isDuplicate: score.overall >= DUPLICATE_THRESHOLD
      })
    }
  }
  
  // Sort by score descending
  return matches.sort((a, b) => b.score.overall - a.score.overall)
}

/**
 * Check if a recipe is likely a duplicate of any existing recipes
 */
export function checkForDuplicates(
  newRecipe: Partial<RecipeWithRelations>,
  existingRecipes: RecipeWithRelations[]
): RecipeMatch[] {
  // Create a temporary full recipe object for comparison
  const tempRecipe: RecipeWithRelations = {
    id: 'temp',
    title: newRecipe.title || '',
    description: newRecipe.description,
    prepTime: newRecipe.prepTime,
    cookTime: newRecipe.cookTime,
    servings: newRecipe.servings,
    ingredients: newRecipe.ingredients || [],
    instructions: newRecipe.instructions || [],
    // tags: newRecipe.tags || [],  // Tags feature temporarily disabled
    categories: newRecipe.categories || [],
    photos: newRecipe.photos || [],
    createdBy: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false,
    isFavorite: false,
    version: 1
  }
  
  return findSimilarRecipes(tempRecipe, existingRecipes, {
    minScore: DUPLICATE_THRESHOLD
  })
}

/**
 * Get a human-readable similarity description
 */
export function getSimilarityDescription(score: number): string {
  if (score >= DUPLICATE_THRESHOLD) return 'Likely duplicate'
  if (score >= 0.75) return 'Very similar'
  if (score >= SIMILAR_THRESHOLD) return 'Similar'
  return 'Different'
}

/**
 * Get specific differences between two recipes
 */
export function getRecipeDifferences(
  recipe1: RecipeWithRelations,
  recipe2: RecipeWithRelations
): string[] {
  const differences: string[] = []
  
  // Title difference
  if (recipe1.title !== recipe2.title) {
    differences.push(`Title: "${recipe1.title}" vs "${recipe2.title}"`)
  }
  
  // Servings difference
  if (recipe1.servings !== recipe2.servings) {
    differences.push(`Servings: ${recipe1.servings || 'unspecified'} vs ${recipe2.servings || 'unspecified'}`)
  }
  
  // Time differences
  const time1 = (recipe1.prepTime || 0) + (recipe1.cookTime || 0)
  const time2 = (recipe2.prepTime || 0) + (recipe2.cookTime || 0)
  if (time1 !== time2) {
    differences.push(`Total time: ${time1} min vs ${time2} min`)
  }
  
  // Ingredient differences
  const ings1 = new Set(recipe1.ingredients.map(i => normalizeIngredient(i.ingredient)))
  const ings2 = new Set(recipe2.ingredients.map(i => normalizeIngredient(i.ingredient)))
  
  const onlyIn1 = [...ings1].filter(i => ![...ings2].some(i2 => stringSimilarity(i, i2) > 0.8))
  const onlyIn2 = [...ings2].filter(i => ![...ings1].some(i1 => stringSimilarity(i, i1) > 0.8))
  
  if (onlyIn1.length > 0) {
    differences.push(`Only in first: ${onlyIn1.join(', ')}`)
  }
  if (onlyIn2.length > 0) {
    differences.push(`Only in second: ${onlyIn2.join(', ')}`)
  }
  
  // Instruction count difference
  if (recipe1.instructions.length !== recipe2.instructions.length) {
    differences.push(`Steps: ${recipe1.instructions.length} vs ${recipe2.instructions.length}`)
  }
  
  return differences
}