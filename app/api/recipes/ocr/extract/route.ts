import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

// Schema for extracted recipe data
const ExtractedRecipeSchema = z.object({
  title: z.string().describe("The recipe title"),
  description: z.string().optional().describe("A brief description of the recipe"),
  prepTime: z.number().optional().describe("Preparation time in minutes"),
  cookTime: z.number().optional().describe("Cooking time in minutes"),
  servings: z.number().optional().describe("Number of servings"),
  ingredients: z.array(
    z.object({
      amount: z.string().optional().describe("Amount (e.g., '2', '1/2', '1.5')"),
      unit: z.string().optional().describe("Unit of measurement (e.g., 'cup', 'tbsp', 'oz')"),
      ingredient: z.string().describe("The ingredient name"),
      notes: z.string().optional().describe("Any notes or preparation instructions"),
    })
  ).describe("List of ingredients"),
  instructions: z.array(
    z.string().describe("A single instruction step")
  ).describe("List of cooking instructions"),
  sourceName: z.string().optional().describe("Who the recipe is from (e.g., 'Grandma Betty')"),
  sourceNotes: z.string().optional().describe("Any family notes, memories, or tips"),
  categories: z.array(z.string()).optional().describe("Suggested categories (e.g., 'dessert', 'main dish')"),
  // tags: z.array(z.string()).optional().describe("Suggested tags (e.g., 'holiday', 'family favorite')"),  // Tags feature temporarily disabled
  confidence: z.object({
    overall: z.number().min(0).max(1).describe("Overall confidence in extraction (0-1)"),
    fields: z.record(z.number().min(0).max(1)).optional().describe("Confidence for each field"),
  }).describe("Confidence scores for the extraction"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const { extractedText } = await request.json();
    
    if (!extractedText || typeof extractedText !== "string") {
      return NextResponse.json(
        { error: "No text provided for extraction" },
        { status: 400 }
      );
    }

    // Extract structured recipe data using Claude
    try {
      const { object: extractedRecipe } = await generateObject({
        model: anthropic("claude-3-5-sonnet-20241022"),
        schema: ExtractedRecipeSchema,
        prompt: `Extract structured recipe data from the following text. Be as accurate as possible and include confidence scores for your extraction.

Important guidelines:
1. Convert cooking times to minutes (e.g., "1 hour" = 60, "1.5 hours" = 90)
2. Standardize ingredient amounts where possible (e.g., "1/4 cup" stays as "1/4", "half cup" becomes "1/2")
3. Keep units as they appear (don't convert between metric/imperial)
4. If multiple categories seem appropriate, include all that apply
5. Extract any family notes, memories, or special tips into sourceNotes
6. If the source/contributor is mentioned, include it in sourceName
7. Set confidence scores based on how clear and unambiguous the information is

Text to extract from:
${extractedText}`,
        temperature: 0.2,
        maxTokens: 4000,
      });

      // Post-process the extracted data
      const processedRecipe = {
        ...extractedRecipe,
        // Ensure arrays are properly formatted
        ingredients: extractedRecipe.ingredients.map((ing, index) => ({
          ...ing,
          orderIndex: index,
        })),
        instructions: extractedRecipe.instructions.map((instruction, index) => ({
          stepNumber: index + 1,
          instruction,
        })),
      };

      return NextResponse.json({
        success: true,
        recipe: processedRecipe,
      });
    } catch (extractionError) {
      console.error("Extraction error:", extractionError);
      return NextResponse.json(
        { error: "Failed to extract recipe data from text" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in recipe extraction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}