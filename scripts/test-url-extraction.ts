#!/usr/bin/env tsx

/**
 * Test script for URL recipe extraction with ingredient parsing
 * Usage: pnpm tsx scripts/test-url-extraction.ts <recipe-url>
 */

import { RecipeUrlParser } from '../lib/services/recipe-url-parser'

async function testExtraction(url: string) {
  console.log(`\nExtracting recipe from: ${url}\n`)
  
  try {
    const parser = new RecipeUrlParser()
    const recipe = await parser.extractFromUrl(url)
    
    console.log('Title:', recipe.title)
    console.log('Description:', recipe.description?.substring(0, 100) + '...')
    console.log('\nIngredients:')
    
    if (recipe.ingredients) {
      recipe.ingredients.forEach((ing, idx) => {
        console.log(`  ${idx + 1}. Amount: ${ing.amount || '-'}, Unit: ${ing.unit || '-'}, Ingredient: ${ing.ingredient}${ing.notes ? ` (${ing.notes})` : ''}`)
      })
    }
    
    console.log('\nInstructions:')
    if (recipe.instructions) {
      recipe.instructions.forEach((inst, idx) => {
        console.log(`  ${idx + 1}. ${inst.substring(0, 80)}...`)
      })
    }
    
    console.log('\nOther info:')
    console.log('  Prep time:', recipe.prepTime, 'minutes')
    console.log('  Cook time:', recipe.cookTime, 'minutes')
    console.log('  Servings:', recipe.servings)
    console.log('  Source:', recipe.sourceName)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Get URL from command line
const url = process.argv[2]
if (!url) {
  console.error('Please provide a recipe URL as an argument')
  console.error('Example: pnpm tsx scripts/test-url-extraction.ts https://www.example.com/recipe')
  process.exit(1)
}

testExtraction(url)