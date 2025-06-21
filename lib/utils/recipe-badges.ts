import type { Ingredient } from '@/lib/types/recipe'

export type RecipeBadge = 
  | 'vegan'
  | 'vegetarian' 
  | 'gluten-free'
  | 'dairy-free'
  | 'keto'
  | 'low-carb'
  | 'paleo'
  | 'whole30'
  | 'nut-free'
  | 'egg-free'
  | 'sugar-free'
  | 'low-sodium'

export interface BadgeInfo {
  id: RecipeBadge
  label: string
  description: string
  color: string // Tailwind color class
  icon?: string // Optional icon name
}

export const BADGE_DEFINITIONS: Record<RecipeBadge, BadgeInfo> = {
  'vegan': {
    id: 'vegan',
    label: 'Vegan',
    description: 'Contains no animal products',
    color: 'emerald',
    icon: 'leaf'
  },
  'vegetarian': {
    id: 'vegetarian',
    label: 'Vegetarian',
    description: 'Contains no meat or fish',
    color: 'green',
    icon: 'leaf'
  },
  'gluten-free': {
    id: 'gluten-free',
    label: 'Gluten-Free',
    description: 'Contains no gluten',
    color: 'amber',
    icon: 'wheat-off'
  },
  'dairy-free': {
    id: 'dairy-free',
    label: 'Dairy-Free',
    description: 'Contains no dairy products',
    color: 'blue',
    icon: 'milk-off'
  },
  'keto': {
    id: 'keto',
    label: 'Keto',
    description: 'Low carb, high fat',
    color: 'purple',
    icon: 'activity'
  },
  'low-carb': {
    id: 'low-carb',
    label: 'Low-Carb',
    description: 'Reduced carbohydrate content',
    color: 'indigo',
    icon: 'trending-down'
  },
  'paleo': {
    id: 'paleo',
    label: 'Paleo',
    description: 'Paleolithic diet friendly',
    color: 'orange',
    icon: 'mountain'
  },
  'whole30': {
    id: 'whole30',
    label: 'Whole30',
    description: 'Whole30 compliant',
    color: 'teal',
    icon: 'check-circle'
  },
  'nut-free': {
    id: 'nut-free',
    label: 'Nut-Free',
    description: 'Contains no tree nuts or peanuts',
    color: 'red',
    icon: 'nut-off'
  },
  'egg-free': {
    id: 'egg-free',
    label: 'Egg-Free',
    description: 'Contains no eggs',
    color: 'yellow',
    icon: 'egg-off'
  },
  'sugar-free': {
    id: 'sugar-free',
    label: 'Sugar-Free',
    description: 'Contains no added sugars',
    color: 'pink',
    icon: 'candy-off'
  },
  'low-sodium': {
    id: 'low-sodium',
    label: 'Low-Sodium',
    description: 'Reduced sodium content',
    color: 'cyan',
    icon: 'droplet'
  }
}

// Keywords that indicate non-vegan ingredients
const NON_VEGAN_KEYWORDS = [
  // Meat
  'beef', 'pork', 'chicken', 'turkey', 'lamb', 'veal', 'duck', 'goose',
  'bacon', 'ham', 'sausage', 'pepperoni', 'salami', 'prosciutto',
  'ground beef', 'ground turkey', 'ground chicken', 'ground pork',
  'steak', 'roast', 'chops', 'ribs', 'wings', 'breast', 'thigh', 'drumstick',
  'hot dog', 'bratwurst', 'chorizo', 'kielbasa',
  
  // Fish & Seafood
  'fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'trout', 'bass',
  'shrimp', 'prawns', 'crab', 'lobster', 'scallops', 'oysters', 'clams', 'mussels',
  'anchovies', 'sardines', 'calamari', 'squid', 'octopus',
  
  // Dairy
  'milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'sour cream',
  'cottage cheese', 'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'feta',
  'cream cheese', 'half and half', 'whipping cream', 'heavy cream',
  'buttermilk', 'evaporated milk', 'condensed milk', 'ice cream',
  
  // Eggs
  'egg', 'eggs', 'egg white', 'egg yolk', 'mayonnaise', 'mayo', 'aioli',
  
  // Other animal products
  'honey', 'gelatin', 'gelatine', 'lard', 'tallow', 'ghee',
  'whey', 'casein', 'albumin', 'bone broth', 'stock', 'broth'
]

// Keywords that indicate non-vegetarian ingredients (subset of non-vegan)
const NON_VEGETARIAN_KEYWORDS = [
  // Meat
  'beef', 'pork', 'chicken', 'turkey', 'lamb', 'veal', 'duck', 'goose',
  'bacon', 'ham', 'sausage', 'pepperoni', 'salami', 'prosciutto',
  'ground beef', 'ground turkey', 'ground chicken', 'ground pork',
  'steak', 'roast', 'chops', 'ribs', 'wings', 'breast', 'thigh', 'drumstick',
  'hot dog', 'bratwurst', 'chorizo', 'kielbasa',
  
  // Fish & Seafood
  'fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'trout', 'bass',
  'shrimp', 'prawns', 'crab', 'lobster', 'scallops', 'oysters', 'clams', 'mussels',
  'anchovies', 'sardines', 'calamari', 'squid', 'octopus',
  
  // Other meat products
  'gelatin', 'gelatine', 'lard', 'tallow', 'bone broth', 'stock', 'broth'
]

// Keywords that indicate gluten-containing ingredients
const GLUTEN_KEYWORDS = [
  'wheat', 'flour', 'all-purpose flour', 'bread flour', 'cake flour', 'whole wheat',
  'bread', 'breadcrumbs', 'panko', 'croutons', 'pita', 'naan', 'tortilla',
  'pasta', 'noodles', 'spaghetti', 'linguine', 'penne', 'macaroni', 'lasagna',
  'couscous', 'orzo', 'udon', 'ramen',
  'barley', 'rye', 'spelt', 'kamut', 'triticale', 'bulgur', 'durum', 'semolina',
  'beer', 'malt', 'malt vinegar', 'malt syrup',
  'soy sauce', 'teriyaki', 'hoisin',
  'seitan', 'vital wheat gluten'
]

// Keywords that indicate dairy ingredients
const DAIRY_KEYWORDS = [
  'milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'sour cream',
  'cottage cheese', 'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'feta',
  'cream cheese', 'half and half', 'whipping cream', 'heavy cream',
  'buttermilk', 'evaporated milk', 'condensed milk', 'ice cream',
  'whey', 'casein', 'lactose', 'ghee'
]

// Non-dairy milk alternatives that shouldn't count as dairy
const NON_DAIRY_MILKS = [
  'coconut milk', 'almond milk', 'soy milk', 'oat milk', 'rice milk',
  'cashew milk', 'hemp milk', 'hazelnut milk', 'macadamia milk'
]

// Keywords that indicate high-carb ingredients (not keto/low-carb)
const HIGH_CARB_KEYWORDS = [
  // Grains
  'rice', 'pasta', 'bread', 'noodles', 'couscous', 'quinoa', 'oats', 'oatmeal',
  'cereal', 'granola', 'barley', 'wheat', 'corn', 'cornmeal', 'polenta',
  
  // Starchy vegetables
  'potato', 'potatoes', 'sweet potato', 'yam', 'cassava', 'taro',
  
  // Legumes (not keto but okay for some low-carb)
  'beans', 'lentils', 'chickpeas', 'peas', 'black beans', 'kidney beans',
  'pinto beans', 'navy beans', 'cannellini',
  
  // Sugars and sweeteners (excluding sugar-free ones)
  'sugar', 'honey', 'maple syrup', 'agave', 'molasses', 'corn syrup',
  'brown sugar', 'powdered sugar', 'confectioner sugar',
  
  // High-carb fruits
  'banana', 'apple', 'orange', 'grape', 'mango', 'pineapple',
  
  // High-carb flours (excluding low-carb alternatives)
  'all-purpose flour', 'bread flour', 'cake flour', 'whole wheat flour'
]

// Keywords that indicate nuts
const NUT_KEYWORDS = [
  'almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans',
  'cashew', 'cashews', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts',
  'macadamia', 'brazil nut', 'pine nut', 'pine nuts',
  'peanut', 'peanuts', 'peanut butter', 'almond butter', 'nut butter',
  'mixed nuts', 'nut flour', 'almond flour', 'almond milk'
]

// Keywords that indicate eggs
const EGG_KEYWORDS = [
  'egg', 'eggs', 'egg white', 'egg yolk', 'beaten egg', 'egg wash',
  'mayonnaise', 'mayo', 'aioli', 'meringue', 'custard'
]

// Keywords that indicate added sugars
const SUGAR_KEYWORDS = [
  'sugar', 'honey', 'maple syrup', 'agave', 'molasses', 'corn syrup',
  'brown sugar', 'powdered sugar', 'confectioner sugar', 'cane sugar',
  'coconut sugar', 'date sugar', 'turbinado', 'demerara',
  'jam', 'jelly', 'preserves', 'marmalade'
]

// Keywords that indicate high sodium
const HIGH_SODIUM_KEYWORDS = [
  'salt', 'sea salt', 'kosher salt', 'table salt', 'himalayan salt',
  'soy sauce', 'tamari', 'fish sauce', 'oyster sauce', 'worcestershire',
  'bouillon', 'broth', 'stock', 'bacon', 'ham', 'prosciutto',
  'pickled', 'pickle', 'olives', 'capers', 'anchovies',
  'cheese', 'feta', 'parmesan', 'blue cheese'
]

/**
 * Analyze ingredients to determine which badges apply
 */
export function detectRecipeBadges(ingredients: Ingredient[]): RecipeBadge[] {
  const badges: RecipeBadge[] = []
  const ingredientTexts = ingredients.map(i => i.ingredient.toLowerCase())
  
  // Helper function to check if any ingredient contains keywords
  const hasAnyKeyword = (keywords: string[], exclusions: string[] = []) => {
    return ingredientTexts.some(text => {
      // Check if it's an excluded item first
      if (exclusions.some(exclude => text.includes(exclude))) {
        return false
      }
      // Then check if it contains any of the keywords
      return keywords.some(keyword => text.includes(keyword))
    })
  }
  
  // Vegan check (no animal products at all)
  const isVegan = !hasAnyKeyword(NON_VEGAN_KEYWORDS, NON_DAIRY_MILKS)
  if (isVegan) {
    badges.push('vegan')
    badges.push('vegetarian') // Vegan is always vegetarian
    badges.push('dairy-free') // Vegan is always dairy-free
    badges.push('egg-free') // Vegan is always egg-free
  } else {
    // Vegetarian check (no meat/fish but can have dairy/eggs)
    const isVegetarian = !hasAnyKeyword(NON_VEGETARIAN_KEYWORDS)
    if (isVegetarian) {
      badges.push('vegetarian')
    }
    
    // Dairy-free check
    const isDairyFree = !hasAnyKeyword(DAIRY_KEYWORDS, NON_DAIRY_MILKS)
    if (isDairyFree) {
      badges.push('dairy-free')
    }
    
    // Egg-free check
    const isEggFree = !hasAnyKeyword(EGG_KEYWORDS)
    if (isEggFree) {
      badges.push('egg-free')
    }
  }
  
  // Gluten-free check (independent of vegan/vegetarian)
  // Special handling for gluten-free flours
  const hasGlutenFreeFlour = ingredientTexts.some(text => 
    text.includes('almond flour') || 
    text.includes('coconut flour') || 
    text.includes('rice flour') ||
    text.includes('corn flour') ||
    text.includes('tapioca flour') ||
    text.includes('chickpea flour')
  )
  
  const hasGluten = ingredientTexts.some(text => {
    // Check if it's a gluten-free flour first
    if (hasGlutenFreeFlour && (
      text.includes('almond flour') || 
      text.includes('coconut flour') || 
      text.includes('rice flour') ||
      text.includes('corn flour') ||
      text.includes('tapioca flour') ||
      text.includes('chickpea flour')
    )) {
      return false
    }
    // Otherwise check against gluten keywords
    return GLUTEN_KEYWORDS.some(keyword => text.includes(keyword))
  })
  
  if (!hasGluten) {
    badges.push('gluten-free')
  }
  
  // Keto/Low-carb check
  const hasHighCarbs = hasAnyKeyword(HIGH_CARB_KEYWORDS)
  if (!hasHighCarbs) {
    // Additional check: must be high in fats/proteins
    const hasFats = hasAnyKeyword(['butter', 'oil', 'cream', 'cheese', 'avocado', 'nuts'])
    const hasProteins = hasAnyKeyword(['meat', 'chicken', 'fish', 'eggs', 'cheese'])
    
    if (hasFats || hasProteins) {
      badges.push('keto')
      badges.push('low-carb')
    }
  }
  
  // Paleo check (no grains, legumes, dairy, processed foods)
  const noPaleoForbidden = !hasAnyKeyword([
    ...GLUTEN_KEYWORDS,
    ...DAIRY_KEYWORDS,
    'beans', 'lentils', 'chickpeas', 'peas', 'soy', 'tofu',
    'sugar', 'corn syrup', 'artificial'
  ])
  if (noPaleoForbidden) {
    badges.push('paleo')
  }
  
  // Nut-free check
  const isNutFree = !hasAnyKeyword(NUT_KEYWORDS)
  if (isNutFree) {
    badges.push('nut-free')
  }
  
  // Sugar-free check
  const isSugarFree = !hasAnyKeyword(SUGAR_KEYWORDS)
  if (isSugarFree) {
    badges.push('sugar-free')
  }
  
  // Low-sodium check (this is trickier - we check for absence of high-sodium ingredients)
  const highSodiumCount = ingredientTexts.filter(text => 
    HIGH_SODIUM_KEYWORDS.some(keyword => text.includes(keyword))
  ).length
  
  // If less than 2 high-sodium ingredients, consider it low-sodium
  if (highSodiumCount < 2) {
    badges.push('low-sodium')
  }
  
  return badges
}

/**
 * Get badge display information
 */
export function getBadgeInfo(badge: RecipeBadge): BadgeInfo {
  return BADGE_DEFINITIONS[badge]
}

/**
 * Format badges for display with Tailwind classes
 */
export function getBadgeClasses(badge: RecipeBadge): string {
  const info = BADGE_DEFINITIONS[badge]
  const colorMap: Record<string, string> = {
    'emerald': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    'green': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'amber': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'blue': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'purple': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'indigo': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    'orange': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'teal': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    'red': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'yellow': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'pink': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    'cyan': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  }
  
  return colorMap[info.color] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}