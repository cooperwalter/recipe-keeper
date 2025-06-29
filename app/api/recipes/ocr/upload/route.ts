import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_DIMENSION = 4096; // Max dimension for Claude

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
  confidence: z.object({
    overall: z.number().min(0).max(1).describe("Overall confidence in extraction (0-1)"),
    fields: z.record(z.number().min(0).max(1)).optional().describe("Confidence for each field"),
  }).describe("Confidence scores for the extraction"),
  extractedText: z.string().describe("The raw text extracted from the image for reference"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Process image with sharp
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let processedBuffer: Buffer = buffer;
    let contentType = file.type;

    try {
      // Convert HEIC/HEIF to JPEG if needed
      if (file.type === "image/heic" || file.type === "image/heif") {
        processedBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
        contentType = "image/jpeg";
      }

      // Resize if too large
      const metadata = await sharp(processedBuffer).metadata();
      if (metadata.width && metadata.height) {
        if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
          processedBuffer = await sharp(processedBuffer)
            .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .toBuffer();
        }
      }
    } catch (error) {
      console.error("Image processing error:", error);
      // Continue with original buffer if processing fails
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("ocr-uploads")
      .upload(fileName, processedBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("ocr-uploads")
      .getPublicUrl(fileName);

    // Check if Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      // Clean up uploaded file
      await supabase.storage.from("ocr-uploads").remove([fileName]);
      
      return NextResponse.json(
        { error: "OCR service not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Extract and parse recipe in a single API call using Claude Haiku for cost efficiency
    try {
      const base64Image = processedBuffer.toString("base64");
      const mimeType = contentType;
      
      // Using Claude 3 Haiku for cost efficiency (~10x cheaper than Sonnet)
      // For complex handwritten recipes, you can upgrade to:
      // model: anthropic("claude-3-5-sonnet-20241022")
      const { object: extractedRecipe } = await generateObject({
        model: anthropic("claude-3-haiku-20240307"),
        schema: ExtractedRecipeSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract structured recipe data from this image. 

Important guidelines:
1. First, extract ALL visible text from the image
2. Then parse it into the structured format
3. Convert cooking times to minutes (e.g., "1 hour" = 60)
4. Standardize ingredient amounts (e.g., "half cup" becomes "1/2")
5. Keep units as they appear (don't convert between metric/imperial)
6. Include any family notes, memories, or special tips in sourceNotes
7. Set confidence scores based on how clearly you can read the text
8. Include the raw extracted text in the extractedText field

Be thorough and accurate in your extraction.`,
              },
              {
                type: "image",
                image: `data:${mimeType};base64,${base64Image}`,
              },
            ],
          },
        ],
        temperature: 0.2,
        maxTokens: 4000,
      });

      // Post-process the extracted data
      const processedRecipe = {
        ...extractedRecipe,
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
        imageUrl: publicUrl,
        extractedText: extractedRecipe.extractedText,
        recipe: processedRecipe,
        fileName: uploadData.path,
      });
    } catch (ocrError) {
      console.error("OCR error:", ocrError);
      
      // Clean up uploaded file
      await supabase.storage.from("ocr-uploads").remove([fileName]);
      
      return NextResponse.json(
        { error: "Failed to extract text from image" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in OCR upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}