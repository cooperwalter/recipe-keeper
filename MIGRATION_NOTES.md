# Migration Notes

## Add Ingredient Adjustments Column (2025-06-17)

To add support for ingredient adjustments, run the following SQL command on your database:

```sql
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "ingredient_adjustments" jsonb;
```

This column stores user-specific adjustments to ingredient amounts as a JSON object mapping ingredient IDs to custom amounts.

### Features Added:
- Users can now adjust individual ingredient amounts
- Adjustments persist across sessions
- Works with all scaling levels (1x, 2x, 3x)
- Adjustments are saved automatically with a 1-second debounce