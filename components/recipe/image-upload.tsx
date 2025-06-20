"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Loader2, Camera, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingText } from "@/components/ui/loading-states";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ImageUploadProps {
  onUpload: (file: File) => void;
  onRemove?: () => void;
  isUploading?: boolean;
  preview?: string;
  error?: string;
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
};

export function ImageUpload({
  onUpload,
  onRemove,
  isUploading = false,
  preview,
  error,
  className,
}: ImageUploadProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        // Create local preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setLocalPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        // Call parent handler
        onUpload(file);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalPreview(null);
    onRemove?.();
  };

  const displayPreview = preview || localPreview;
  const rejectionError = fileRejections[0]?.errors[0]?.message;
  const displayError = error || rejectionError;

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          "hover:border-primary/50 hover:bg-accent/5",
          isDragActive && "border-primary bg-accent/10",
          isUploading && "pointer-events-none opacity-60",
          displayError && "border-destructive",
          displayPreview ? "border-solid bg-accent/5" : "border-muted-foreground/25"
        )}
      >
        <input 
          {...getInputProps()} 
          // Add capture attribute for mobile camera access
          capture="environment"
          // Accept attribute for better mobile support
          accept="image/*"
        />
        
        {displayPreview ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            <Image
              src={displayPreview}
              alt="Recipe preview"
              fill
              className="object-contain"
            />
            {!isUploading && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            {isUploading ? (
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            ) : isDragActive ? (
              <Upload className="h-12 w-12 text-primary" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            )}
            
            <div className="space-y-2">
              {isUploading ? (
                <LoadingText text="Uploading" className="text-sm font-medium" />
              ) : (
                <p className="text-sm font-medium">
                  {isDragActive
                    ? "Drop your recipe image here"
                    : "Upload your recipe image"}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Tap to take a photo or choose from gallery
              </p>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex flex-col items-center gap-1">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs">Camera</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs">Gallery</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Max 10MB • JPG, PNG, WebP
              </p>
            </div>
          </div>
        )}
      </div>
      
      {displayError && (
        <p className="mt-2 text-sm text-destructive">{displayError}</p>
      )}
    </div>
  );
}