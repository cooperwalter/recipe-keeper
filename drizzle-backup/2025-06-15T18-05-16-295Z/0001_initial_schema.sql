-- Create enum for recipe categories
CREATE TYPE "public"."recipe_category" AS ENUM('appetizer', 'main_dish', 'side_dish', 'dessert', 'beverage', 'breakfast', 'lunch', 'dinner', 'snack', 'sauce', 'soup', 'salad', 'bread', 'other');

-- Recipe categories table
CREATE TABLE IF NOT EXISTS "recipe_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "recipe_categories_slug_unique" UNIQUE("slug")
);

-- Recipes table
CREATE TABLE IF NOT EXISTS "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"prep_time" integer,
	"cook_time" integer,
	"servings" integer DEFAULT 4,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_public" boolean DEFAULT false,
	"source_name" text,
	"source_notes" text,
	"version" integer DEFAULT 1,
	"parent_recipe_id" uuid
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"ingredient" text NOT NULL,
	"amount" numeric(10, 2),
	"unit" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Instructions table
CREATE TABLE IF NOT EXISTS "instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"instruction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Recipe photos table
CREATE TABLE IF NOT EXISTS "recipe_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"is_original" boolean DEFAULT false,
	"caption" text,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Recipe category mappings table
CREATE TABLE IF NOT EXISTS "recipe_category_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Recipe tags table
CREATE TABLE IF NOT EXISTS "recipe_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Recipe versions table
CREATE TABLE IF NOT EXISTS "recipe_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"change_summary" text,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipe_data" jsonb NOT NULL
);

-- Favorites table
CREATE TABLE IF NOT EXISTS "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Schema migrations table
CREATE TABLE IF NOT EXISTS "schema_migrations" (
	"version" text PRIMARY KEY NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now(),
	"checksum" text
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "instructions" ADD CONSTRAINT "instructions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "recipe_photos" ADD CONSTRAINT "recipe_photos_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "recipe_category_mappings" ADD CONSTRAINT "recipe_category_mappings_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "recipe_category_mappings" ADD CONSTRAINT "recipe_category_mappings_category_id_recipe_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."recipe_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "recipe_tags" ADD CONSTRAINT "recipe_tags_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "favorites" ADD CONSTRAINT "favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "recipes" ADD CONSTRAINT "recipes_parent_recipe_id_recipes_id_fk" FOREIGN KEY ("parent_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_recipes_created_by" ON "recipes" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "idx_recipes_created_at" ON "recipes" USING btree ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_recipes_title" ON "recipes" USING btree ("title");
CREATE INDEX IF NOT EXISTS "idx_ingredients_recipe_id" ON "ingredients" USING btree ("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_instructions_recipe_id" ON "instructions" USING btree ("recipe_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_recipe_step" ON "instructions" USING btree ("recipe_id","step_number");
CREATE INDEX IF NOT EXISTS "idx_recipe_photos_recipe_id" ON "recipe_photos" USING btree ("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_category_mappings_recipe_id" ON "recipe_category_mappings" USING btree ("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_category_mappings_category_id" ON "recipe_category_mappings" USING btree ("category_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_recipe_category" ON "recipe_category_mappings" USING btree ("recipe_id","category_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_tags_recipe_id" ON "recipe_tags" USING btree ("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_tags_tag" ON "recipe_tags" USING btree ("tag");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_recipe_tag" ON "recipe_tags" USING btree ("recipe_id","tag");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_recipe_version" ON "recipe_versions" USING btree ("recipe_id","version_number");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_recipe" ON "favorites" USING btree ("recipe_id","user_id");
CREATE INDEX IF NOT EXISTS "idx_favorites_user_id" ON "favorites" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_favorites_recipe_id" ON "favorites" USING btree ("recipe_id");

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();