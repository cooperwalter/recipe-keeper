# Advanced Recipe Scaling Feature - Design Approaches

## Problem Statement
When scaling recipes, not all ingredients scale linearly. For example:
- Spices and seasonings often need less than proportional scaling
- Baking soda/powder may have minimum thresholds
- Cooking times and temperatures may need adjustment
- Pan sizes affect scaling decisions

## Design Goals
1. **Simplicity**: Keep the interface intuitive for all users
2. **Flexibility**: Allow customization without requiring it
3. **Intelligence**: Provide smart defaults based on ingredient types
4. **Non-intrusive**: Don't overwhelm users who just want basic scaling

## Approach 1: Inline Adjustment (Recommended) ✨

### Overview
Allow users to adjust individual ingredient amounts directly in the scaled view with minimal UI changes.

### User Flow
1. User selects scale (2x, 3x, etc.)
2. All ingredients scale normally
3. For ingredients that may need adjustment, show a subtle "adjust" icon
4. Clicking the icon shows a simple slider or input to fine-tune that specific amount
5. Adjusted amounts are highlighted differently (e.g., subtle background color)

### Implementation
```tsx
// Each ingredient shows:
2 cups flour
1 tsp salt [↔️] <- Adjustment icon appears on hover/tap

// Clicking adjustment icon shows inline:
1 tsp salt [slider: 0.5-2 tsp]
```

### Pros
- Minimal UI changes
- Progressive disclosure - complexity only when needed
- Easy to understand
- Works well on mobile
- Can save custom adjustments per recipe

### Cons
- Requires interaction to discover adjustments
- May not be obvious to all users

## Approach 2: Smart Scaling Profiles

### Overview
Predefined scaling profiles that automatically adjust certain ingredient categories.

### User Flow
1. User selects scale amount
2. User optionally selects a scaling profile:
   - "Standard" - Linear scaling (default)
   - "Baking Smart" - Adjusts leavening, salt, spices
   - "Savory Smart" - Adjusts seasonings, aromatics
   - "Custom" - User's saved preferences

### Implementation
```tsx
Scale: [1x] [2x] [3x]
Profile: [Standard ▼]
         • Standard (exact proportions)
         • Smart Baking (adjusts leavening & spices)
         • Smart Cooking (adjusts seasonings)
         • My Custom Profile
```

### Pros
- One-click solution for common cases
- Educational - teaches users about scaling
- Can build a library of profiles

### Cons
- Adds complexity to the UI
- May not cover all cases
- Users might not understand profiles

## Approach 3: Scaling Wizard

### Overview
A step-by-step wizard that guides users through scaling decisions.

### User Flow
1. User clicks "Scale Recipe" button
2. Wizard asks: "How many servings do you need?"
3. Shows preview with flagged ingredients: "These ingredients may need adjustment"
4. User can accept suggestions or modify
5. Option to save as new recipe version

### Pros
- Very clear and guided
- Educational
- Can explain why certain adjustments are recommended

### Cons
- Interrupts the flow
- Too many steps for simple scaling
- Might feel heavy for experienced users

## Approach 4: Category-Based Rules

### Overview
Automatically apply scaling rules based on ingredient categories with toggle to override.

### User Flow
1. System categorizes ingredients automatically (flour, spices, leavening, etc.)
2. Applies smart scaling rules by category
3. Shows a summary: "3 ingredients were adjusted for better results"
4. User can expand to see details or revert to linear scaling

### Implementation
```
Scaled to 3x (12 servings)
✓ Smart adjustments applied to seasonings

Ingredients:
3 cups flour
1.5 tsp salt (adjusted from 3 tsp)
[Show all adjustments]
```

### Pros
- Automatic and intelligent
- Minimal user intervention
- Can learn from user corrections

### Cons
- Less control for users
- Requires accurate categorization
- May seem like "magic" to users

## Recommended Approach: Inline Adjustment with Smart Defaults

### Why This Approach?
1. **Maintains Simplicity**: The basic interface remains clean and unchanged
2. **Progressive Enhancement**: Advanced features only appear when relevant
3. **User Control**: Users can choose to engage with adjustments or ignore them
4. **Mobile Friendly**: Works well on all screen sizes
5. **Intuitive**: Adjustments happen right where users are looking

### Detailed Implementation Plan

#### Phase 1: Basic Inline Adjustment
1. Add adjustment icon to ingredients known to scale non-linearly
2. Click/tap shows a simple slider or +/- buttons
3. Adjusted values are visually distinguished
4. Store adjustments in local state

#### Phase 2: Smart Suggestions
1. AI-powered suggestions based on ingredient type
2. Tooltip explains why adjustment might be needed
3. One-click to accept suggestion

#### Phase 3: Saved Preferences
1. Allow saving adjusted recipe as a "scaled version"
2. Remember user's scaling preferences per ingredient type
3. Build up intelligence over time

### Technical Architecture

```typescript
interface ScaledIngredient extends Ingredient {
  scaledAmount: number
  customAmount?: number  // User override
  adjustmentSuggestion?: {
    amount: number
    reason: string
  }
  isAdjustable: boolean
}

// Scaling rules engine
const scalingRules: Record<IngredientType, ScalingRule> = {
  spice: { factor: 0.75, minAmount: 0.25 },
  salt: { factor: 0.8, minAmount: 0.5 },
  leavening: { factor: 0.9, threshold: 2 },
  // ... more rules
}
```

### UI Mockup
```
🥘 Recipe Scaler
Scale: [1x] [2x] [3x]     (12 servings)

Ingredients:
• 6 cups all-purpose flour
• 1½ tsp salt [↔️]         ← Hover shows: "Adjust seasoning"
• ¾ tsp black pepper [↔️]  ← Already adjusted (highlighted)
• 6 large eggs
• 3 tbsp olive oil

[💡 Tip: Seasonings scaled conservatively. Click ↔️ to adjust]
```

### Database Schema Addition
```sql
-- Store custom scaling preferences
CREATE TABLE recipe_scaling_preferences (
  id UUID PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id),
  user_id UUID REFERENCES auth.users(id),
  scale_factor DECIMAL(3,1),
  ingredient_adjustments JSONB, -- {ingredient_id: custom_amount}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR(255) -- e.g., "Party Size", "Meal Prep"
);
```

## Success Metrics
1. **Adoption Rate**: % of users who use scaling adjustments
2. **Satisfaction**: User feedback on scaled recipe results
3. **Retention**: Users who save custom scaled versions
4. **Simplicity**: Time to complete scaling task
5. **Discovery**: % of users who find adjustment features

## Conclusion
The inline adjustment approach balances simplicity with power. It keeps the interface clean for basic users while providing advanced functionality for those who need it. The progressive disclosure ensures that complexity is introduced only when beneficial, maintaining the "simple and intuitive" goal while solving the real problem of non-linear scaling.