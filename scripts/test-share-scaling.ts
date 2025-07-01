#!/usr/bin/env tsx

import { scaleIngredientWithRules } from '../lib/utils/recipe-scaling'

// Test the scaling functionality with string amounts (as returned by the database)
const testIngredients = [
  { id: '1', ingredient: 'flour', amount: '2', unit: 'cups', orderIndex: 0 },
  { id: '2', ingredient: 'sugar', amount: '1.5', unit: 'cups', orderIndex: 1 },
  { id: '3', ingredient: 'salt', amount: '0.5', unit: 'tsp', orderIndex: 2 },
  { id: '4', ingredient: 'eggs', amount: '3', unit: '', orderIndex: 3 },
]

console.log('Testing recipe scaling with string amounts (as from database):')
console.log('================================================================\n')

for (const scale of [1, 2, 3]) {
  console.log(`\nScale: ${scale}x`)
  console.log('------------')
  
  for (const ingredient of testIngredients) {
    // Convert string amount to number (as done in the share page)
    const ingredientWithNumericAmount = {
      ...ingredient,
      amount: ingredient.amount ? parseFloat(ingredient.amount) : undefined
    }
    
    const scaled = scaleIngredientWithRules(ingredientWithNumericAmount, scale)
    const displayAmount = scaled.scaledAmount || scaled.amount || 0
    
    console.log(`${ingredient.ingredient}: ${ingredient.amount} ${ingredient.unit} → ${displayAmount} ${ingredient.unit}`)
    if (scaled.adjustmentReason && scale > 1) {
      console.log(`  (${scaled.adjustmentReason})`)
    }
  }
}

console.log('\n✅ Scaling test complete!')