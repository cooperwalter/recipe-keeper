CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ingredients" text[] DEFAULT '{}' NOT NULL,
	"instructions" text[] DEFAULT '{}' NOT NULL,
	"prep_time" integer,
	"cook_time" integer,
	"servings" integer DEFAULT 4,
	"difficulty" "difficulty",
	"category_id" uuid,
	"source" text,
	"source_url" text,
	"nutrition_info" jsonb,
	"tags" text[] DEFAULT '{}',
	"is_public" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schema_migrations" (
	"version" text PRIMARY KEY NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now(),
	"checksum" text
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_photos" ADD CONSTRAINT "recipe_photos_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_recipe" ON "favorites" USING btree ("user_id","recipe_id");--> statement-breakpoint
CREATE INDEX "idx_favorites_user_id" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_favorites_recipe_id" ON "favorites" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_recipe_photos_recipe_id" ON "recipe_photos" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_recipes_user_id" ON "recipes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recipes_created_at" ON "recipes" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_recipes_title" ON "recipes" USING btree ("title");--> statement-breakpoint
CREATE INDEX "idx_recipes_category_id" ON "recipes" USING btree ("category_id");