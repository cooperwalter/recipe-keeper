"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "./image-upload";
import { OCRReviewForm } from "./ocr-review-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, ScanLine, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type Step = "upload" | "processing" | "review" | "creating";

interface ExtractedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: Array<{
    amount?: string;
    unit?: string;
    ingredient: string;
    notes?: string;
    orderIndex: number;
  }>;
  instructions: Array<{
    stepNumber: number;
    instruction: string;
  }>;
  sourceName?: string;
  sourceNotes?: string;
  categories?: string[];
  tags?: string[];
  confidence: {
    overall: number;
    fields?: Record<string, number>;
  };
}

export function OCRRecipeFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [, setExtractedText] = useState<string>("");
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageUpload = async (file: File) => {
    setError(null);
    setStep("processing");
    setUploadProgress(20);

    try {
      // Upload and extract text
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/recipes/ocr/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(40);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const { imageUrl: url, extractedText: text } = await uploadResponse.json();
      setImageUrl(url);
      setExtractedText(text);
      setUploadProgress(60);

      // Extract structured recipe data
      const extractResponse = await fetch("/api/recipes/ocr/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ extractedText: text }),
      });

      setUploadProgress(80);

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || "Failed to extract recipe data");
      }

      const { recipe } = await extractResponse.json();
      setExtractedRecipe(recipe);
      setUploadProgress(100);
      
      // Move to review step
      setTimeout(() => {
        setStep("review");
      }, 500);
    } catch (err) {
      console.error("OCR error:", err);
      setError(err instanceof Error ? err.message : "Failed to process image");
      setStep("upload");
    }
  };

  const handleRecipeSubmit = async (recipe: ExtractedRecipe) => {
    setStep("creating");
    setError(null);

    try {
      // Create the recipe
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          ingredients: recipe.ingredients.map((ing) => ing.ingredient),
          instructions: recipe.instructions.map((inst) => inst.instruction),
          sourceName: recipe.sourceName,
          sourceNotes: recipe.sourceNotes,
          tags: recipe.tags || [],
          isPublic: false,
          photoUrl: imageUrl, // Include the original recipe image
          photoCaption: "Original recipe",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create recipe");
      }

      const { id } = await response.json();
      
      // Clean up OCR upload
      try {
        const supabase = createClient();
        const fileName = imageUrl.split("/").pop();
        if (fileName) {
          await supabase.storage.from("ocr-uploads").remove([fileName]);
        }
      } catch (cleanupError) {
        console.error("Failed to clean up OCR upload:", cleanupError);
        // Continue anyway
      }

      // Redirect to the new recipe
      router.push(`/protected/recipes/${id}`);
    } catch (err) {
      console.error("Recipe creation error:", err);
      setError(err instanceof Error ? err.message : "Failed to create recipe");
      setStep("review");
    }
  };

  const handleCancel = () => {
    // Clean up uploaded image if exists
    if (imageUrl) {
      const supabase = createClient();
      const fileName = imageUrl.split("/").pop();
      if (fileName) {
        supabase.storage.from("ocr-uploads").remove([fileName]).catch(() => {
          // Ignore errors during cleanup
        });
      }
    }
    
    router.push("/protected/recipes");
  };

  const getStepIcon = (currentStep: Step) => {
    switch (currentStep) {
      case "upload":
        return <ScanLine className="h-5 w-5" />;
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case "review":
        return <CheckCircle className="h-5 w-5" />;
      case "creating":
        return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  };

  const getStepTitle = (currentStep: Step) => {
    switch (currentStep) {
      case "upload":
        return "Upload Recipe Image";
      case "processing":
        return "Processing Image";
      case "review":
        return "Review & Edit Recipe";
      case "creating":
        return "Creating Recipe";
    }
  };

  const getStepDescription = (currentStep: Step) => {
    switch (currentStep) {
      case "upload":
        return "Upload a photo of your recipe card or handwritten recipe";
      case "processing":
        return "Extracting text and analyzing recipe structure...";
      case "review":
        return "Review the extracted information and make any necessary edits";
      case "creating":
        return "Saving your recipe...";
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {getStepIcon(step)}
            <div>
              <CardTitle>{getStepTitle(step)}</CardTitle>
              <CardDescription>{getStepDescription(step)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {step === "processing" && (
          <CardContent>
            <Progress value={uploadProgress} className="w-full" />
          </CardContent>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6">
            <ImageUpload
              onUpload={handleImageUpload}
              error={error || undefined}
            />
          </CardContent>
        </Card>
      )}

      {step === "processing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyzing your recipe image...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && extractedRecipe && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Original Recipe</CardTitle>
                <CardDescription>Reference image for comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border">
                  <Image
                    src={imageUrl}
                    alt="Original recipe"
                    fill
                    className="object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <OCRReviewForm
              extractedRecipe={extractedRecipe}
              imageUrl={imageUrl}
              onSubmit={handleRecipeSubmit}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {step === "creating" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Creating your recipe...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}