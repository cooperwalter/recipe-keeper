import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex, index, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const recipeCategoryEnum = pgEnum('recipe_category', [
  'appetizer', 'main_dish', 'side_dish', 'dessert', 'beverage', 
  'breakfast', 'lunch', 'dinner', 'snack', 'sauce', 
  'soup', 'salad', 'bread', 'other'
]);

// Recipe Categories table
export const recipeCategories = pgTable('recipe_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Recipes table
export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  prepTime: integer('prep_time'), // in minutes
  cookTime: integer('cook_time'), // in minutes
  servings: integer('servings').default(4),
  createdBy: uuid('created_by').notNull(), // References auth.users
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  isPublic: boolean('is_public').default(false),
  sourceName: text('source_name'), // who contributed the recipe
  sourceNotes: text('source_notes'), // family notes & memories
  version: integer('version').default(1),
  parentRecipeId: uuid('parent_recipe_id'), // for versioning - self reference added via relations
  ingredientAdjustments: jsonb('ingredient_adjustments'), // stores custom adjustments per ingredient
  badges: text('badges').array(), // dietary badges like vegan, gluten-free, etc
}, (table) => {
  return {
    createdByIdx: index('idx_recipes_created_by').on(table.createdBy),
    createdAtIdx: index('idx_recipes_created_at').on(table.createdAt.desc()),
    titleIdx: index('idx_recipes_title').on(table.title),
  };
});

// Ingredients table
export const ingredients = pgTable('ingredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  ingredient: text('ingredient').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  unit: text('unit'),
  orderIndex: integer('order_index').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    recipeIdIdx: index('idx_ingredients_recipe_id').on(table.recipeId),
  };
});

// Instructions table
export const instructions = pgTable('instructions', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  stepNumber: integer('step_number').notNull(),
  instruction: text('instruction').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    recipeIdIdx: index('idx_instructions_recipe_id').on(table.recipeId),
    uniqueRecipeStep: uniqueIndex('unique_recipe_step').on(table.recipeId, table.stepNumber),
  };
});

// Recipe photos table
export const recipePhotos = pgTable('recipe_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  photoUrl: text('photo_url').notNull(),
  isOriginal: boolean('is_original').default(false), // true if it's the original recipe card
  caption: text('caption'),
  uploadedBy: uuid('uploaded_by').notNull(), // References auth.users
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    recipeIdIdx: index('idx_recipe_photos_recipe_id').on(table.recipeId),
  };
});

// Recipe category mappings table (many-to-many)
export const recipeCategoryMappings = pgTable('recipe_category_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => recipeCategories.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    recipeIdIdx: index('idx_recipe_category_mappings_recipe_id').on(table.recipeId),
    categoryIdIdx: index('idx_recipe_category_mappings_category_id').on(table.categoryId),
    uniqueRecipeCategory: uniqueIndex('unique_recipe_category').on(table.recipeId, table.categoryId),
  };
});

// Recipe versions table
export const recipeVersions = pgTable('recipe_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  versionNumber: integer('version_number').notNull(),
  changeSummary: text('change_summary'),
  changedBy: uuid('changed_by').notNull(), // References auth.users
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  recipeData: jsonb('recipe_data').notNull(), // stores snapshot of recipe at this version
}, (table) => {
  return {
    uniqueRecipeVersion: uniqueIndex('unique_recipe_version').on(table.recipeId, table.versionNumber),
  };
});

// User profiles table
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique(), // References auth.users
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex('idx_user_profiles_user_id').on(table.userId),
  };
});

// Favorites table
export const favorites = pgTable('favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').notNull(), // References auth.users
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    uniqueUserRecipe: uniqueIndex('unique_user_recipe').on(table.recipeId, table.userId),
    userIdIdx: index('idx_favorites_user_id').on(table.userId),
    recipeIdIdx: index('idx_favorites_recipe_id').on(table.recipeId),
  };
});

// Schema migrations table
export const schemaMigrations = pgTable('schema_migrations', {
  version: text('version').primaryKey(),
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow(),
  checksum: text('checksum'),
});

// Relations
export const recipeCategoriesRelations = relations(recipeCategories, ({ many }) => ({
  recipeMappings: many(recipeCategoryMappings),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  parentRecipe: one(recipes, {
    fields: [recipes.parentRecipeId],
    references: [recipes.id],
  }),
  childRecipes: many(recipes),
  ingredients: many(ingredients),
  instructions: many(instructions),
  photos: many(recipePhotos),
  categoryMappings: many(recipeCategoryMappings),
  versions: many(recipeVersions),
  favorites: many(favorites),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ingredients.recipeId],
    references: [recipes.id],
  }),
}));

export const instructionsRelations = relations(instructions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [instructions.recipeId],
    references: [recipes.id],
  }),
}));

export const recipePhotosRelations = relations(recipePhotos, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipePhotos.recipeId],
    references: [recipes.id],
  }),
}));

export const recipeCategoryMappingsRelations = relations(recipeCategoryMappings, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeCategoryMappings.recipeId],
    references: [recipes.id],
  }),
  category: one(recipeCategories, {
    fields: [recipeCategoryMappings.categoryId],
    references: [recipeCategories.id],
  }),
}));

export const recipeVersionsRelations = relations(recipeVersions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeVersions.recipeId],
    references: [recipes.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  recipe: one(recipes, {
    fields: [favorites.recipeId],
    references: [recipes.id],
  }),
}));

// Types
export type RecipeCategory = typeof recipeCategories.$inferSelect;
export type NewRecipeCategory = typeof recipeCategories.$inferInsert;

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;

export type Instruction = typeof instructions.$inferSelect;
export type NewInstruction = typeof instructions.$inferInsert;

export type RecipePhoto = typeof recipePhotos.$inferSelect;
export type NewRecipePhoto = typeof recipePhotos.$inferInsert;

export type RecipeCategoryMapping = typeof recipeCategoryMappings.$inferSelect;
export type NewRecipeCategoryMapping = typeof recipeCategoryMappings.$inferInsert;

export type RecipeVersion = typeof recipeVersions.$inferSelect;
export type NewRecipeVersion = typeof recipeVersions.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;