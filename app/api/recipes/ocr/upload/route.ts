import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_DIMENSION = 4096; // Max dimension for Claude

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

    // Extract text using Claude's vision capabilities
    try {
      const base64Image = processedBuffer.toString("base64");
      const mimeType = contentType;
      
      const { text: extractedText } = await generateText({
        model: anthropic("claude-3-5-sonnet-20241022"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please extract ALL text from this recipe image. Include:
- Recipe title
- All ingredients with amounts and units
- All cooking instructions/steps
- Any cooking times, temperatures, or serving information
- Any notes or tips
- Source attribution if visible

Return the raw text exactly as it appears, preserving the structure and formatting as much as possible.`,
              },
              {
                type: "image",
                image: `data:${mimeType};base64,${base64Image}`,
              },
            ],
          },
        ],
        temperature: 0.1,
        maxTokens: 4000,
      });

      return NextResponse.json({
        imageUrl: publicUrl,
        extractedText,
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