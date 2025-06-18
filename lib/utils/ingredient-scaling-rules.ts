/**
 * Advanced scaling rules for different ingredient types
 */

export type IngredientCategory = 
  | 'spice'
  | 'herb'
  | 'salt'
  | 'sugar'
  | 'fat'
  | 'liquid'
  | 'flour'
  | 'leavening'
  | 'acid'
  | 'dairy'
  | 'egg'
  | 'vegetable'
  | 'meat'
  | 'other';

export interface ScalingRule {
  category: IngredientCategory;
  scalingFactor: number; // How much to scale relative to base (e.g., 0.75 = 75% of linear scaling)
  minAmount?: number; // Minimum amount regardless of scaling
  maxAmount?: number; // Maximum amount regardless of scaling
  threshold?: number; // Scale factor at which special rules apply
  reason: string; // Explanation for the adjustment
}

// Keywords that help identify ingredient categories
const categoryKeywords: Record<IngredientCategory, string[]> = {
  spice: ['pepper', 'paprika', 'cumin', 'coriander', 'turmeric', 'cinnamon', 'nutmeg', 'clove', 'cardamom', 'cayenne', 'chili', 'curry', 'garam masala', 'five spice', 'allspice'],
  herb: ['basil', 'oregano', 'thyme', 'rosemary', 'sage', 'parsley', 'cilantro', 'dill', 'mint', 'tarragon', 'chive', 'bay leaf', 'marjoram'],
  salt: ['salt', 'kosher salt', 'sea salt', 'fleur de sel', 'himalayan salt', 'table salt', 'rock salt'],
  sugar: ['sugar', 'brown sugar', 'powdered sugar', 'confectioner', 'granulated', 'caster', 'demerara', 'turbinado', 'honey', 'maple syrup', 'molasses', 'agave'],
  fat: ['butter', 'oil', 'shortening', 'lard', 'ghee', 'margarine', 'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'peanut oil'],
  liquid: ['water', 'milk', 'cream', 'broth', 'stock', 'wine', 'beer', 'juice', 'vinegar', 'coffee', 'tea'],
  flour: ['flour', 'all-purpose', 'bread flour', 'cake flour', 'whole wheat', 'almond flour', 'coconut flour', 'rice flour', 'cornmeal', 'semolina'],
  leavening: ['baking soda', 'baking powder', 'yeast', 'cream of tartar', 'self-rising', 'active dry yeast', 'instant yeast'],
  acid: ['lemon juice', 'lime juice', 'vinegar', 'citrus', 'wine vinegar', 'balsamic', 'rice vinegar', 'apple cider vinegar'],
  dairy: ['milk', 'cream', 'yogurt', 'sour cream', 'cheese', 'ricotta', 'mozzarella', 'parmesan', 'cheddar', 'cream cheese', 'buttermilk'],
  egg: ['egg', 'eggs', 'egg white', 'egg yolk', 'beaten egg', 'egg wash'],
  vegetable: ['onion', 'garlic', 'carrot', 'celery', 'potato', 'tomato', 'bell pepper', 'broccoli', 'spinach', 'kale', 'lettuce', 'cabbage', 'zucchini', 'eggplant', 'mushroom'],
  meat: ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'shrimp', 'bacon', 'sausage', 'ground beef', 'steak', 'roast'],
  other: []
};

// Scaling rules for each category
export const scalingRules: Record<IngredientCategory, Omit<ScalingRule, 'category'>> = {
  spice: {
    scalingFactor: 0.75,
    minAmount: 0.125, // 1/8 tsp
    reason: "Spices intensify with larger batches - scale conservatively"
  },
  herb: {
    scalingFactor: 0.85,
    reason: "Herbs can overpower when doubled or tripled linearly"
  },
  salt: {
    scalingFactor: 0.8,
    minAmount: 0.25, // 1/4 tsp
    reason: "Salt perception increases non-linearly"
  },
  sugar: {
    scalingFactor: 0.95,
    reason: "Sugar scales mostly linear but slightly less in large batches"
  },
  fat: {
    scalingFactor: 0.9,
    reason: "Less fat needed for larger batches due to surface area"
  },
  liquid: {
    scalingFactor: 1.0,
    reason: "Liquids scale linearly"
  },
  flour: {
    scalingFactor: 1.0,
    reason: "Flour scales linearly for consistent texture"
  },
  leavening: {
    scalingFactor: 0.85,
    minAmount: 0.25, // 1/4 tsp
    threshold: 2,
    reason: "Leavening doesn't need to double for double batches"
  },
  acid: {
    scalingFactor: 0.9,
    reason: "Acids can become too strong when scaled linearly"
  },
  dairy: {
    scalingFactor: 1.0,
    reason: "Dairy products scale linearly"
  },
  egg: {
    scalingFactor: 1.0,
    minAmount: 1, // Can't have less than 1 egg
    reason: "Eggs typically scale linearly, but consider whole eggs"
  },
  vegetable: {
    scalingFactor: 1.0,
    reason: "Vegetables scale linearly"
  },
  meat: {
    scalingFactor: 1.0,
    reason: "Proteins scale linearly"
  },
  other: {
    scalingFactor: 1.0,
    reason: "Standard linear scaling"
  }
};

/**
 * Detect the category of an ingredient based on its name
 */
export function detectIngredientCategory(ingredientName: string): IngredientCategory {
  const lowerName = ingredientName.toLowerCase();
  
  // Check for more specific matches first
  if (lowerName.includes('bell pepper') || 
      lowerName.includes('sweet pepper') || 
      lowerName.includes('red pepper') && !lowerName.includes('pepper flakes') ||
      lowerName.includes('green pepper') && !lowerName.includes('peppercorn')) {
    return 'vegetable';
  }
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category as IngredientCategory;
    }
  }
  
  return 'other';
}

/**
 * Get scaling rule for an ingredient
 */
export function getScalingRule(ingredientName: string): ScalingRule {
  const category = detectIngredientCategory(ingredientName);
  const rule = scalingRules[category];
  
  return {
    category,
    ...rule
  };
}

/**
 * Check if an ingredient should show adjustment controls
 * Now returns true for ALL ingredients (user can adjust any ingredient when scaling)
 */
export function isAdjustableIngredient(): boolean {
  // All ingredients are now adjustable when scaling
  return true;
}

/**
 * Calculate smart scaled amount based on rules
 */
export function calculateSmartScaledAmount(
  originalAmount: number,
  scaleFactor: number,
  ingredientName: string
): number {
  const rule = getScalingRule(ingredientName);
  
  // Apply the category's scaling factor
  let scaledAmount = originalAmount * scaleFactor * rule.scalingFactor;
  
  // Apply threshold rules
  if (rule.threshold && scaleFactor > rule.threshold) {
    // For ingredients like leavening, we scale less aggressively past threshold
    const extraScale = scaleFactor - rule.threshold;
    scaledAmount = originalAmount * rule.threshold * rule.scalingFactor + 
                   (originalAmount * extraScale * rule.scalingFactor * 0.5);
  }
  
  // Apply min/max constraints
  if (rule.minAmount !== undefined && scaledAmount < rule.minAmount) {
    scaledAmount = rule.minAmount;
  }
  if (rule.maxAmount !== undefined && scaledAmount > rule.maxAmount) {
    scaledAmount = rule.maxAmount;
  }
  
  // Round to reasonable precision
  return Math.round(scaledAmount * 100) / 100;
}