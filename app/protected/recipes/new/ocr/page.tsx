import { OCRRecipeFlow } from "@/components/recipe/ocr-recipe-flow";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function OCRRecipePage() {
  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/protected/recipes/new">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recipe Options
          </Button>
        </Link>
      </div>
      
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Scan Recipe from Image</h1>
        <p className="text-muted-foreground mb-8">
          Upload a photo of your recipe and we&apos;ll extract the text for you
        </p>
        
        <OCRRecipeFlow />
      </div>
    </div>
  );
}