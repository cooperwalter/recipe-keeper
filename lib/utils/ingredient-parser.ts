/**
 * Ingredient parsing utilities
 * Parses ingredient strings into structured format with amount, unit, and name
 */

// Common measurement units and their variations
const UNITS = {
  // Volume
  cup: ['cups', 'cup', 'c', 'c.'],
  tablespoon: ['tablespoons', 'tablespoon', 'tbsp', 'tbsps', 'tbs', 'tb', 'T'],
  teaspoon: ['teaspoons', 'teaspoon', 'tsp', 'tsps', 'ts', 't'],
  fluid_ounce: ['fluid ounces', 'fluid ounce', 'fl oz', 'fl. oz', 'fl oz.', 'fluid oz'],
  milliliter: ['milliliters', 'milliliter', 'ml', 'mL'],
  liter: ['liters', 'liter', 'l', 'L'],
  gallon: ['gallons', 'gallon', 'gal'],
  quart: ['quarts', 'quart', 'qt', 'qts'],
  pint: ['pints', 'pint', 'pt', 'pts'],
  
  // Weight
  pound: ['pounds', 'pound', 'lbs', 'lb', 'lb.'],
  ounce: ['ounces', 'ounce', 'oz', 'oz.'],
  gram: ['grams', 'gram', 'g', 'gr', 'gm'],
  kilogram: ['kilograms', 'kilogram', 'kg', 'kgs'],
  milligram: ['milligrams', 'milligram', 'mg'],
  
  // Count/other
  piece: ['pieces', 'piece', 'pc', 'pcs'],
  slice: ['slices', 'slice'],
  clove: ['cloves', 'clove'],
  can: ['cans', 'can'],
  package: ['packages', 'package', 'pkg', 'pkgs'],
  bunch: ['bunches', 'bunch'],
  dash: ['dashes', 'dash'],
  pinch: ['pinches', 'pinch'],
  handful: ['handfuls', 'handful'],
  sprig: ['sprigs', 'sprig'],
  stick: ['sticks', 'stick'],
  
  // Generic
  small: ['small'],
  medium: ['medium', 'med'],
  large: ['large', 'lg'],
}

// Create a flat array of all unit variations for regex
const ALL_UNITS = Object.values(UNITS).flat()

// Common fraction unicode characters
const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
}

export interface ParsedIngredient {
  amount?: string
  unit?: string
  ingredient: string
  notes?: string
}

/**
 * Parse an ingredient string into structured format
 */
export function parseIngredient(ingredientStr: string): ParsedIngredient {
  if (!ingredientStr || typeof ingredientStr !== 'string') {
    return { ingredient: '' }
  }

  let workingStr = ingredientStr.trim()
  
  // Replace unicode fractions
  Object.entries(UNICODE_FRACTIONS).forEach(([unicode, fraction]) => {
    workingStr = workingStr.replace(new RegExp(unicode, 'g'), fraction)
  })

  // Extract notes in parentheses at the end
  let notes: string | undefined
  const notesMatch = workingStr.match(/\(([^)]+)\)(?:\s*$|,\s*$)/)
  if (notesMatch) {
    notes = notesMatch[1].trim()
    workingStr = workingStr.replace(notesMatch[0], '').trim()
  }

  // Remove leading bullets or special characters (but not numbers that might be part of amount)
  workingStr = workingStr.replace(/^[\-\*\•\▪\→\>]+\s*/, '')
  // Remove leading list numbers like "1." or "2)"
  workingStr = workingStr.replace(/^\d+[\.\)]\s+/, '')

  // Try to extract amount and unit
  const { amount, unit, remainder } = extractAmountAndUnit(workingStr)

  return {
    amount: amount || undefined,
    unit: unit || undefined,
    ingredient: remainder.trim(),
    notes: notes || undefined,
  }
}

/**
 * Extract amount and unit from the beginning of an ingredient string
 */
function extractAmountAndUnit(str: string): { amount?: string; unit?: string; remainder: string } {
  // Regex patterns for amounts
  const fractionPattern = '\\d+\\s*/\\s*\\d+' // 1/2, 3/4, etc
  const mixedFractionPattern = '\\d+\\s+\\d+\\s*/\\s*\\d+' // 1 1/2, 2 3/4, etc
  const decimalPattern = '\\d+\\.\\d+' // 1.5, 2.25, etc
  const rangePattern = '\\d+\\s*(?:-|to)\\s*\\d+' // 1-2, 3 to 4, etc
  const wholeNumberPattern = '\\d+' // 1, 2, 3, etc
  
  // Combined amount pattern - order matters! More specific patterns first
  const amountPattern = `(${mixedFractionPattern}|${decimalPattern}|${rangePattern}|${fractionPattern}|${wholeNumberPattern})`
  
  // Create unit pattern from all known units (escape special regex characters)
  const escapedUnits = ALL_UNITS.map(unit => 
    unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')
  const unitPattern = `(${escapedUnits})(?:\\.|\\s|$)`
  
  // Try to match amount + unit
  const amountUnitRegex = new RegExp(`^${amountPattern}\\s*${unitPattern}`, 'i')
  const amountUnitMatch = str.match(amountUnitRegex)
  
  if (amountUnitMatch) {
    return {
      amount: amountUnitMatch[1].trim(),
      unit: normalizeUnit(amountUnitMatch[2]),
      remainder: str.substring(amountUnitMatch[0].length).trim()
    }
  }
  
  // Try to match just amount (no unit)
  const amountOnlyRegex = new RegExp(`^${amountPattern}\\s+`, 'i')
  const amountOnlyMatch = str.match(amountOnlyRegex)
  
  if (amountOnlyMatch) {
    // Check if the next word might be a multi-word unit like "fluid ounces"
    const afterAmount = str.substring(amountOnlyMatch[0].length)
    const multiWordUnitMatch = afterAmount.match(/^(fluid\s+ounces?|fl\.\s*oz\.?)/i)
    
    if (multiWordUnitMatch) {
      return {
        amount: amountOnlyMatch[1].trim(),
        unit: normalizeUnit(multiWordUnitMatch[0]),
        remainder: afterAmount.substring(multiWordUnitMatch[0].length).trim()
      }
    }
    
    return {
      amount: amountOnlyMatch[1].trim(),
      remainder: afterAmount.trim()
    }
  }
  
  // Check for units at the beginning without amounts (e.g., "dash of salt")
  const unitOnlyRegex = new RegExp(`^${unitPattern}\\s+(?:of\\s+)?`, 'i')
  const unitOnlyMatch = str.match(unitOnlyRegex)
  
  if (unitOnlyMatch) {
    return {
      unit: normalizeUnit(unitOnlyMatch[1]),
      remainder: str.substring(unitOnlyMatch[0].length).trim()
    }
  }
  
  // No amount or unit found
  return { remainder: str }
}

/**
 * Normalize unit to standard form
 */
function normalizeUnit(unit: string): string {
  const lowerUnit = unit.toLowerCase().trim()
  
  // Find the standard unit name for this variation
  for (const [standard, variations] of Object.entries(UNITS)) {
    if (variations.some(v => v.toLowerCase() === lowerUnit)) {
      // For size descriptors (small, medium, large), return as found
      if (['small', 'medium', 'large'].includes(standard)) {
        return unit.toLowerCase()
      }
      // Return the singular form for consistency
      return variations[1] || variations[0] // Second item is usually singular
    }
  }
  
  return unit // Return as-is if not found
}

/**
 * Parse multiple ingredients at once
 */
export function parseIngredients(ingredients: string[]): ParsedIngredient[] {
  return ingredients.map(parseIngredient)
}

/**
 * Format a parsed ingredient back to a string
 */
export function formatIngredient(parsed: ParsedIngredient): string {
  const parts = []
  
  if (parsed.amount) parts.push(parsed.amount)
  if (parsed.unit) parts.push(parsed.unit)
  parts.push(parsed.ingredient)
  
  let result = parts.join(' ')
  if (parsed.notes) {
    result += ` (${parsed.notes})`
  }
  
  return result
}