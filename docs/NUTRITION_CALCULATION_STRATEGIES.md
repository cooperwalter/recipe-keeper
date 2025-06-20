# Nutrition Calculation Strategies Comparison

## Overview
This document compares different approaches for implementing real-time nutrition calculations in Recipe Keeper, evaluating accuracy, cost, performance, and user experience.

## Strategy Comparison

### 1. **LLM-Based Approach (e.g., Claude, GPT-4)**

#### Pros:
- **Natural Language Understanding**: Can parse complex ingredient descriptions ("1 cup homemade chicken stock, low sodium")
- **Context Awareness**: Understands cooking methods that affect nutrition ("fried" vs "baked")
- **Flexible Input**: Handles non-standard measurements and descriptions
- **Brand Recognition**: Can estimate nutrition for branded products
- **Cooking Loss Calculations**: Can estimate nutrient loss from cooking methods

#### Cons:
- **Cost**: ~$0.01-0.03 per recipe calculation
- **Accuracy Concerns**: May hallucinate nutrition values
- **Latency**: 2-5 seconds per calculation
- **Rate Limits**: API throttling concerns
- **Consistency**: Same ingredient might yield different values
- **No Guarantee**: Cannot verify accuracy of generated values

#### Implementation:
```typescript
// Example LLM prompt
const prompt = `
Calculate nutrition information for this recipe:
- 2 cups all-purpose flour
- 1/2 cup unsalted butter
- 3 large eggs
Servings: 12

Provide calories, protein, carbs, fat per serving.
`;
```

### 2. **Nutrition Database API (USDA, Nutritionix, Edamam)**

#### Pros:
- **High Accuracy**: Government/scientific verified data
- **Comprehensive**: Thousands of ingredients with detailed micronutrients
- **Consistent**: Same query returns same results
- **Real-time Updates**: Databases regularly updated
- **Trusted Source**: Can cite authoritative sources

#### Cons:
- **Parsing Complexity**: Need sophisticated NLP to match ingredients
- **Limited Coverage**: May not have all ingredients
- **API Costs**: $0.001-0.01 per ingredient lookup
- **Brand Limitations**: Generic items only in some databases
- **Measurement Conversion**: Need separate logic for units

#### Popular Options:
1. **USDA FoodData Central** (Free)
   - Most comprehensive
   - Free API with 3,600 requests/hour
   - No branded items

2. **Nutritionix** ($$$)
   - 800k+ branded items
   - Restaurant foods
   - $0.0025 per API call

3. **Edamam** ($$)
   - Good parsing capabilities
   - 500k+ foods
   - Free tier: 10k calls/month

4. **Spoonacular** ($$)
   - Recipe-focused
   - Auto ingredient parsing
   - $0.01 per request

### 3. **Hybrid Approach (Database + LLM Fallback)**

#### Pros:
- **Best of Both**: Accuracy when possible, flexibility when needed
- **Cost Optimized**: Use free USDA first, LLM only for unknowns
- **High Coverage**: Can handle any ingredient
- **Caching Benefits**: Store common calculations
- **Progressive Enhancement**: Improve over time

#### Cons:
- **Complex Implementation**: Multiple systems to maintain
- **Inconsistent Experience**: Different response times
- **Data Reconciliation**: Merging different data formats

#### Implementation Flow:
```typescript
async function calculateNutrition(ingredients: Ingredient[]) {
  const results = [];
  
  for (const ingredient of ingredients) {
    // 1. Check cache
    const cached = await cache.get(ingredient);
    if (cached) {
      results.push(cached);
      continue;
    }
    
    // 2. Try USDA database
    const parsed = parseIngredient(ingredient);
    const usdaMatch = await searchUSDA(parsed);
    if (usdaMatch) {
      results.push(usdaMatch);
      await cache.set(ingredient, usdaMatch);
      continue;
    }
    
    // 3. Fallback to LLM
    const llmResult = await askLLM(ingredient);
    results.push(llmResult);
    await cache.set(ingredient, llmResult, { confidence: 'low' });
  }
  
  return aggregateNutrition(results);
}
```

### 4. **Local Database with ML Parsing**

#### Pros:
- **No API Costs**: After initial setup
- **Fast**: <100ms calculations
- **Privacy**: No external API calls
- **Offline Capable**: Works without internet
- **Customizable**: Can add local ingredients

#### Cons:
- **Initial Setup**: Large database download (100MB+)
- **Maintenance**: Need to update periodically
- **Limited Data**: Smaller dataset than APIs
- **Parsing Accuracy**: Need good ML model

#### Implementation:
- Download USDA database
- Use NLP library (compromise, natural) for parsing
- TensorFlow.js for ingredient matching
- SQLite for local storage

### 5. **Crowdsourced + Verified Approach**

#### Pros:
- **Community Driven**: Users can contribute nutrition data
- **Recipe Specific**: Exact matches for common recipes
- **Cost Effective**: Minimal API usage
- **Improving Dataset**: Gets better over time

#### Cons:
- **Quality Control**: Need verification system
- **Cold Start**: Limited data initially
- **Trust Issues**: User-submitted data concerns
- **Moderation**: Requires oversight

## Recommended Strategy: Smart Hybrid Approach

### Architecture:
```
1. Ingredient Input
   ↓
2. Smart Parser (NLP)
   ↓
3. Cache Check → HIT → Return Result
   ↓ MISS
4. USDA Database → MATCH → Calculate → Cache → Return
   ↓ NO MATCH
5. Nutritionix API → MATCH → Calculate → Cache → Return
   ↓ NO MATCH
6. LLM Estimation → Validate → Cache (low confidence) → Return
```

### Implementation Details:

#### 1. **Smart Ingredient Parser**
```typescript
interface ParsedIngredient {
  amount: number;
  unit: string;
  foodItem: string;
  modifiers: string[]; // ["diced", "cooked", "drained"]
  brand?: string;
}

// Using compromise.js for NLP
function parseIngredient(text: string): ParsedIngredient {
  // "2 cups Kraft shredded cheddar cheese"
  // → { amount: 2, unit: "cup", foodItem: "cheddar cheese", 
  //     modifiers: ["shredded"], brand: "Kraft" }
}
```

#### 2. **Tiered Caching Strategy**
```typescript
interface NutritionCache {
  high_confidence: Map<string, NutritionData>;  // USDA verified
  medium_confidence: Map<string, NutritionData>; // API results
  low_confidence: Map<string, NutritionData>;    // LLM estimates
}

// Cache for 30 days (high), 7 days (medium), 1 day (low)
```

#### 3. **Real-time Updates**
```typescript
// Use React Query for optimistic updates
const { mutate: updateIngredient } = useMutation({
  mutationFn: async (change) => {
    // Optimistically update UI
    queryClient.setQueryData(['nutrition', recipeId], (old) => {
      return recalculateNutrition(old, change);
    });
    
    // Background calculation
    const nutrition = await calculateNutrition(ingredients);
    return nutrition;
  }
});
```

#### 4. **Cost Optimization**
- Batch ingredient lookups
- Cache at multiple levels (ingredient, recipe, user)
- Use free USDA API as primary source
- Only use paid APIs for branded/restaurant items
- LLM as last resort with user notification

### Database Schema:
```sql
-- Nutrition cache table
CREATE TABLE nutrition_cache (
  id UUID PRIMARY KEY,
  ingredient_text TEXT NOT NULL,
  ingredient_hash TEXT UNIQUE NOT NULL,
  nutrition_data JSONB NOT NULL,
  source TEXT NOT NULL, -- 'usda', 'nutritionix', 'llm'
  confidence FLOAT NOT NULL, -- 0.0 to 1.0
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Recipe nutrition table
CREATE TABLE recipe_nutrition (
  recipe_id UUID REFERENCES recipes(id),
  nutrition_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL,
  PRIMARY KEY (recipe_id, version)
);
```

### User Experience Design:

#### 1. **Progressive Display**
```typescript
// Show available data immediately
<NutritionPanel>
  <CaloriesDisplay value={cached?.calories || "Calculating..."} />
  {!cached && <LoadingSpinner size="small" />}
</NutritionPanel>
```

#### 2. **Confidence Indicators**
```typescript
<NutritionValue 
  label="Protein"
  value={protein}
  confidence={confidence} // Shows different UI for estimates
/>
```

#### 3. **Manual Corrections**
```typescript
<IngredientNutrition
  ingredient={ingredient}
  nutrition={nutrition}
  onCorrect={(newValues) => {
    // User can provide accurate values
    // These become high-confidence cached
  }}
/>
```

## Cost Analysis

### Monthly Cost Estimates (1000 active users, 10 recipes/user)

1. **Pure LLM**: $300-900/month
2. **Pure API**: $100-500/month  
3. **Hybrid**: $50-150/month
4. **Local Only**: $0 (after setup)

### Performance Metrics

| Strategy | Latency | Accuracy | Coverage |
|----------|---------|----------|----------|
| LLM | 2-5s | 70-85% | 100% |
| USDA API | 200-500ms | 95%+ | 60% |
| Nutritionix | 100-300ms | 95%+ | 85% |
| Hybrid | 100ms-2s | 90%+ | 98% |
| Local | <100ms | 90% | 70% |

## Recommendation

**Use the Smart Hybrid Approach** with this priority:
1. Local cache (instant)
2. USDA FoodData Central (free, accurate)
3. Nutritionix for branded items (paid, comprehensive)
4. LLM as final fallback (expensive, flexible)

This provides the best balance of:
- User experience (fast for common items)
- Accuracy (verified data when available)
- Cost efficiency (minimize paid API calls)
- Complete coverage (handle any ingredient)

## Implementation Phases

### Phase 1: Basic USDA Integration
- Integrate USDA API
- Build ingredient parser
- Simple caching
- Basic UI display

### Phase 2: Smart Parsing
- Implement NLP parsing
- Add measurement conversions
- Handle cooking modifications
- Improve matching algorithm

### Phase 3: Full Hybrid System
- Add Nutritionix integration
- Implement LLM fallback
- Build confidence scoring
- Add manual corrections

### Phase 4: Optimization
- Implement batch processing
- Add predictive caching
- Build user contribution system
- Create nutrition trends