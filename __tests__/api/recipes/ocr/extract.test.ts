import { NextRequest } from 'next/server';
import { POST } from '@/app/api/recipes/ocr/extract/route';
import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('ai');

describe('POST /api/recipes/ocr/extract', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it('returns 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extractedText: 'test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if no text is provided', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No text provided for extraction');
  });

  it('returns 400 if extractedText is not a string', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extractedText: 123 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No text provided for extraction');
  });

  it('successfully extracts recipe data from text', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const mockExtractedRecipe = {
      title: 'Chocolate Chip Cookies',
      description: 'Classic homemade cookies',
      prepTime: 15,
      cookTime: 12,
      servings: 24,
      ingredients: [
        {
          amount: '2',
          unit: 'cups',
          ingredient: 'all-purpose flour',
          notes: null,
        },
        {
          amount: '1',
          unit: 'tsp',
          ingredient: 'baking soda',
          notes: null,
        },
      ],
      instructions: [
        'Preheat oven to 375°F',
        'Mix dry ingredients',
      ],
      sourceName: 'Grandma Betty',
      sourceNotes: 'Best served warm with milk',
      categories: ['dessert', 'cookies'],
      tags: ['family-recipe', 'holiday'],
      confidence: {
        overall: 0.9,
        fields: {
          title: 0.95,
          ingredients: 0.85,
        },
      },
    };

    (generateObject as any).mockResolvedValue({
      object: mockExtractedRecipe,
    });

    const extractedText = `
      Grandma Betty's Chocolate Chip Cookies
      
      Ingredients:
      - 2 cups all-purpose flour
      - 1 tsp baking soda
      
      Instructions:
      1. Preheat oven to 375°F
      2. Mix dry ingredients
      
      Prep time: 15 minutes
      Cook time: 12 minutes
      Makes 24 cookies
      
      Note: Best served warm with milk
    `;

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extractedText }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recipe).toEqual({
      ...mockExtractedRecipe,
      ingredients: [
        {
          amount: '2',
          unit: 'cups',
          ingredient: 'all-purpose flour',
          notes: null,
          orderIndex: 0,
        },
        {
          amount: '1',
          unit: 'tsp',
          ingredient: 'baking soda',
          notes: null,
          orderIndex: 1,
        },
      ],
      instructions: [
        {
          stepNumber: 1,
          instruction: 'Preheat oven to 375°F',
        },
        {
          stepNumber: 2,
          instruction: 'Mix dry ingredients',
        },
      ],
    });

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(Object),
        schema: expect.any(Object),
        prompt: expect.stringContaining(extractedText),
        temperature: 0.2,
        maxTokens: 4000,
      })
    );
  });

  it('handles extraction errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    (generateObject as any).mockRejectedValue(new Error('AI service error'));

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extractedText: 'Some recipe text' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to extract recipe data from text');
  });

  it('processes ingredients and instructions with correct indices', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const mockExtractedRecipe = {
      title: 'Simple Recipe',
      ingredients: [
        { ingredient: 'flour' },
        { ingredient: 'sugar' },
        { ingredient: 'eggs' },
      ],
      instructions: [
        'Mix ingredients',
        'Bake',
        'Cool',
      ],
      confidence: {
        overall: 0.8,
      },
    };

    (generateObject as any).mockResolvedValue({
      object: mockExtractedRecipe,
    });

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extractedText: 'Simple recipe text' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recipe.ingredients).toEqual([
      { ingredient: 'flour', orderIndex: 0 },
      { ingredient: 'sugar', orderIndex: 1 },
      { ingredient: 'eggs', orderIndex: 2 },
    ]);
    expect(data.recipe.instructions).toEqual([
      { stepNumber: 1, instruction: 'Mix ingredients' },
      { stepNumber: 2, instruction: 'Bake' },
      { stepNumber: 3, instruction: 'Cool' },
    ]);
  });

  it('handles empty optional fields correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    const mockExtractedRecipe = {
      title: 'Basic Recipe',
      ingredients: [
        { ingredient: 'water' },
      ],
      instructions: [
        'Boil water',
      ],
      confidence: {
        overall: 0.7,
      },
    };

    (generateObject as any).mockResolvedValue({
      object: mockExtractedRecipe,
    });

    const request = new NextRequest('http://localhost:3000/api/recipes/ocr/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extractedText: 'Basic recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recipe).toHaveProperty('title', 'Basic Recipe');
    expect(data.recipe).not.toHaveProperty('description');
    expect(data.recipe).not.toHaveProperty('prepTime');
    expect(data.recipe).not.toHaveProperty('cookTime');
    expect(data.recipe).not.toHaveProperty('servings');
  });
});