import { NextRequest } from 'next/server';
import { POST } from '@/app/api/recipes/ocr/upload/route';
import { createClient } from '@/lib/supabase/server';
import sharp from 'sharp';
import { generateText } from 'ai';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('sharp');
vi.mock('ai');

describe('POST /api/recipes/ocr/upload', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  };

  const mockStorageBucket = {
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
    mockSupabase.storage.from.mockReturnValue(mockStorageBucket);
  });

  it('returns 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const formData = new FormData();
    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if no file is provided', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const formData = new FormData();
    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No file provided');
  });

  it('returns 400 if file is too large', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', largeFile);

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('File size exceeds 10MB limit');
  });

  it('returns 400 for invalid file type', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const invalidFile = new File(['test'], 'test.txt', {
      type: 'text/plain',
    });

    const formData = new FormData();
    formData.append('file', invalidFile);

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid file type. Please upload a JPG, PNG, or WebP image.');
  });

  it('processes and uploads valid image', async () => {
    const mockUser = { id: 'user123' };
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock sharp
    const mockSharpInstance = {
      jpeg: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed')),
      metadata: vi.fn().mockResolvedValue({ width: 1000, height: 800 }),
    };
    (sharp as any).mockReturnValue(mockSharpInstance);

    // Mock storage upload
    mockStorageBucket.upload.mockResolvedValue({
      data: { path: 'user123/123456-recipe.jpg' },
      error: null,
    });

    mockStorageBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/recipe.jpg' },
    });

    // Mock AI text generation
    (generateText as any).mockResolvedValue({
      text: 'Chocolate Chip Cookies\n\nIngredients:\n- 2 cups flour\n- 1 cup sugar',
    });

    const validFile = new File(['test'], 'recipe.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', validFile);

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      imageUrl: 'https://example.com/recipe.jpg',
      extractedText: 'Chocolate Chip Cookies\n\nIngredients:\n- 2 cups flour\n- 1 cup sugar',
      fileName: 'user123/123456-recipe.jpg',
    });

    expect(mockStorageBucket.upload).toHaveBeenCalled();
    expect(generateText).toHaveBeenCalled();
  });

  it('converts HEIC images to JPEG', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const mockSharpInstance = {
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('converted')),
      metadata: vi.fn().mockResolvedValue({ width: 1000, height: 800 }),
    };
    (sharp as any).mockReturnValue(mockSharpInstance);

    mockStorageBucket.upload.mockResolvedValue({
      data: { path: 'user123/123456-recipe.jpg' },
      error: null,
    });

    mockStorageBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/recipe.jpg' },
    });

    (generateText as any).mockResolvedValue({
      text: 'Recipe text',
    });

    const heicFile = new File(['test'], 'recipe.heic', {
      type: 'image/heic',
    });

    const formData = new FormData();
    formData.append('file', heicFile);

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 90 });
  });

  it('resizes large images', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const mockSharpInstance = {
      resize: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('resized')),
      metadata: vi.fn().mockResolvedValue({ width: 5000, height: 4000 }),
    };
    (sharp as any).mockReturnValue(mockSharpInstance);

    mockStorageBucket.upload.mockResolvedValue({
      data: { path: 'user123/123456-recipe.jpg' },
      error: null,
    });

    mockStorageBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/recipe.jpg' },
    });

    (generateText as any).mockResolvedValue({
      text: 'Recipe text',
    });

    const largeImageFile = new File(['test'], 'recipe.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', largeImageFile);

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSharpInstance.resize).toHaveBeenCalledWith(4096, 4096, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  });

  it('cleans up uploaded file on OCR error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const mockSharpInstance = {
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed')),
      metadata: vi.fn().mockResolvedValue({ width: 1000, height: 800 }),
    };
    (sharp as any).mockReturnValue(mockSharpInstance);

    mockStorageBucket.upload.mockResolvedValue({
      data: { path: 'user123/123456-recipe.jpg' },
      error: null,
    });

    mockStorageBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/recipe.jpg' },
    });

    // Mock AI error
    (generateText as any).mockRejectedValue(new Error('OCR failed'));

    const validFile = new File(['test'], 'recipe.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', validFile);

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to extract text from image');
    expect(mockStorageBucket.remove).toHaveBeenCalled();
    const removeCall = mockStorageBucket.remove.mock.calls[0][0];
    expect(removeCall[0]).toMatch(/^user123\/\d+-recipe\.jpg$/);
  });
});