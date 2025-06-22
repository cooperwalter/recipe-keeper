import type { Ingredient } from '@/lib/types/recipe'
import { 
  getScalingRule, 
  calculateSmartScaledAmount, 
  isAdjustableIngredient 
} from './ingredient-scaling-rules'

export interface ScaledIngredient extends Ingredient {
  scaledAmount?: number
  customAmount?: number
  isAdjustable: boolean
  adjustmentReason?: string
  hasCustomAdjustment: boolean
}

/**
 * Formats a number as a fraction or mixed number when appropriate
 */
export function formatAmount(amount: number): string {
  // Handle whole numbers
  if (Number.isInteger(amount)) {
    return amount.toString()
  }

  // Common fractions mapping
  const fractions: Record<number, string> = {
    0.125: '⅛',
    0.25: '¼',
    0.333: '⅓',
    0.375: '⅜',
    0.5: '½',
    0.625: '⅝',
    0.667: '⅔',
    0.75: '¾',
    0.875: '⅞',
  }

  // Check if it's a simple fraction
  const decimal = amount % 1
  const whole = Math.floor(amount)
  
  // Round to 3 decimal places for fraction matching
  const roundedDecimal = Math.round(decimal * 1000) / 1000
  
  if (fractions[roundedDecimal]) {
    if (whole === 0) {
      return fractions[roundedDecimal]
    }
    return `${whole} ${fractions[roundedDecimal]}`
  }

  // For other decimals, round to 2 decimal places
  const rounded = Math.round(amount * 100) / 100
  
  // Remove trailing zeros
  return rounded.toString().replace(/\.?0+$/, '')
}

/**
 * Scales an ingredient amount by the given factor
 */
export function scaleIngredient(ingredient: Ingredient, scale: number): Ingredient {
  if (!ingredient.amount) {
    return ingredient
  }

  return {
    ...ingredient,
    amount: parseFloat(ingredient.amount.toString()) * scale,
  }
}

/**
 * Scales an ingredient with smart adjustments
 */
export function scaleIngredientWithRules(
  ingredient: Ingredient, 
  scale: number,
  customAdjustments?: Record<string, number>
): ScaledIngredient {
  const isAdjustable = ingredient.amount ? isAdjustableIngredient() : false
  
  if (!ingredient.amount) {
    return {
      ...ingredient,
      isAdjustable: false,
      hasCustomAdjustment: false
    }
  }

  const originalAmount = parseFloat(ingredient.amount.toString())
  
  // Check if there's a custom adjustment for this ingredient at this scale
  const adjustmentKey = `${ingredient.id}-${scale}`
  const customAmount = customAdjustments?.[adjustmentKey]
  
  let scaledAmount: number
  let adjustmentReason: string | undefined
  
  if (customAmount !== undefined) {
    // Use custom amount if provided
    scaledAmount = customAmount
  } else if (isAdjustable) {
    // Use smart scaling rules
    scaledAmount = calculateSmartScaledAmount(originalAmount, scale, ingredient.ingredient)
    const rule = getScalingRule(ingredient.ingredient)
    adjustmentReason = rule.reason
  } else {
    // Linear scaling for non-adjustable ingredients
    scaledAmount = originalAmount * scale
  }

  return {
    ...ingredient,
    amount: originalAmount, // Keep original amount
    scaledAmount,
    customAmount,
    isAdjustable,
    adjustmentReason,
    hasCustomAdjustment: customAmount !== undefined
  }
}

/**
 * Get the display amount for a scaled ingredient
 */
export function getDisplayAmount(ingredient: ScaledIngredient): number {
  return ingredient.customAmount ?? ingredient.scaledAmount ?? ingredient.amount ?? 0
}

/**
 * Formats a scaled ingredient for display
 */
export function formatScaledIngredient(ingredient: Ingredient, scale: number): string {
  const scaled = scaleIngredient(ingredient, scale)
  
  let result = ''
  
  if (scaled.amount) {
    result += formatAmount(scaled.amount) + ' '
  }
  
  if (scaled.unit) {
    result += scaled.unit + ' '
  }
  
  result += scaled.ingredient
  
  if (scaled.notes) {
    result += ` (${scaled.notes})`
  }
  
  return result
}