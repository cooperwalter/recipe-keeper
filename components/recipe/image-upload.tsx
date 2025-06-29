"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Loader2, FolderOpen } from "lucide-react";
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
  const [isMobile, setIsMobile] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onDrop([file]);
    }
  };


  const handleGalleryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    galleryInputRef.current?.click();
  };

  const handleMobileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    mobileInputRef.current?.click();
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
          style={{ display: 'none' }}
        />
        
        {/* Hidden file inputs for gallery and mobile */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <input
          ref={mobileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
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
              {!isMobile && (
                <p className="text-xs text-muted-foreground">
                  Drop a file here or use the button below
                </p>
              )}
              <div className="mt-4 w-full px-4 flex justify-center">
                {isMobile ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={handleMobileClick}
                    className="flex items-center gap-2 w-full"
                  >
                    <ImageIcon className="h-5 w-5" />
                    Choose Photo
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={handleGalleryClick}
                    className="flex items-center gap-2"
                  >
                    <FolderOpen className="h-5 w-5" />
                    Upload Photo
                  </Button>
                )}
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