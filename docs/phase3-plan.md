# Phase 3: Recipe Capture & OCR - Implementation Plan

## Overview
This phase adds the ability for users to upload photos of recipes and automatically extract the text using OCR and LLM processing to create structured recipe data.

## Architecture

### Components
1. **ImageUpload Component** - Drag & drop or click to upload images
2. **ImagePreview Component** - Shows uploaded image with zoom capability
3. **OCRProcessor** - Server-side OCR processing using vision API
4. **RecipeExtractor** - LLM-based extraction of structured data
5. **RecipeReview Component** - UI for reviewing and editing extracted data

### API Endpoints
1. `POST /api/recipes/ocr/upload` - Handle image upload and processing
2. `POST /api/recipes/ocr/extract` - Extract structured recipe data from text
3. `POST /api/recipes/ocr/create` - Create recipe from extracted data

### Data Flow
1. User uploads image → stored in Supabase Storage
2. Image URL sent to OCR endpoint → text extraction
3. Extracted text sent to LLM → structured recipe data
4. User reviews/edits data → creates recipe

## Implementation Steps

### 1. Install Dependencies
- Vercel AI SDK: `@ai-sdk/anthropic`
- AI SDK Core: `ai`
- Image processing: `sharp` (for optimization)
- File type validation: `file-type`

### 2. Create Upload Infrastructure
- Supabase bucket for temporary OCR uploads
- Image optimization before OCR
- File size and type validation

### 3. OCR Implementation
- Use Vercel AI SDK with Claude's vision capabilities
- Handle multiple image formats
- Extract text with positional information

### 4. LLM Processing
- Use claude-3-5-sonnet-20241022 for extraction
- Create detailed prompts for recipe extraction
- Return structured JSON with confidence scores

### 5. UI Components
- Drag & drop upload area
- Progress indicators
- Image preview with zoom
- Extracted data review form

### 6. Error Handling
- Invalid file types
- OCR failures
- Missing required fields
- Network errors

### 7. Testing Strategy
- Unit tests for each component
- Integration tests for full flow
- Mock OCR responses for testing
- Test various recipe formats

## Success Criteria
- 85%+ accuracy on printed recipes
- 70%+ accuracy on handwritten recipes
- Handle common recipe formats
- Graceful error handling
- Complete test coverage