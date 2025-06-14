import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);

// Categories table
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  icon: text('icon'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Recipes table
export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // References auth.users
  title: text('title').notNull(),
  description: text('description'),
  ingredients: text('ingredients').array().notNull().default([]),
  instructions: text('instructions').array().notNull().default([]),
  prepTime: integer('prep_time'),
  cookTime: integer('cook_time'),
  servings: integer('servings').default(4),
  difficulty: difficultyEnum('difficulty'),
  categoryId: uuid('category_id').references(() => categories.id),
  source: text('source'),
  sourceUrl: text('source_url'),
  nutritionInfo: jsonb('nutrition_info'),
  tags: text('tags').array().default([]),
  isPublic: boolean('is_public').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('idx_recipes_user_id').on(table.userId),
    createdAtIdx: index('idx_recipes_created_at').on(table.createdAt.desc()),
    titleIdx: index('idx_recipes_title').on(table.title),
    categoryIdIdx: index('idx_recipes_category_id').on(table.categoryId),
  };
});

// Recipe photos table
export const recipePhotos = pgTable('recipe_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  caption: text('caption'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    recipeIdIdx: index('idx_recipe_photos_recipe_id').on(table.recipeId),
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
    uniqueUserRecipe: uniqueIndex('unique_user_recipe').on(table.userId, table.recipeId),
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
export const categoriesRelations = relations(categories, ({ many }) => ({
  recipes: many(recipes),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  category: one(categories, {
    fields: [recipes.categoryId],
    references: [categories.id],
  }),
  photos: many(recipePhotos),
  favorites: many(favorites),
}));

export const recipePhotosRelations = relations(recipePhotos, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipePhotos.recipeId],
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
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type RecipePhoto = typeof recipePhotos.$inferSelect;
export type NewRecipePhoto = typeof recipePhotos.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;