import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Process the transcript with Claude
    const systemPrompt = `You are a helpful assistant that extracts recipe information from spoken transcripts. 
    The user has spoken a recipe description. Extract the following information:
    - Title
    - Description (if mentioned)
    - Ingredients (with amounts and units where specified)
    - Instructions (step by step)
    - Prep time and cook time (if mentioned)
    - Servings (if mentioned)
    - Any source/attribution or family notes
    
    Format the response as JSON with this structure:
    {
      "title": "Recipe Name",
      "description": "Brief description if mentioned",
      "ingredients": [
        {"ingredient": "flour", "amount": "2", "unit": "cups"},
        {"ingredient": "eggs", "amount": "3", "unit": ""}
      ],
      "instructions": ["Step 1 text", "Step 2 text"],
      "prepTime": 15,
      "cookTime": 30,
      "servings": 4,
      "sourceName": "Who shared this recipe",
      "sourceNotes": "Any family notes or memories mentioned"
    }
    
    Important:
    - Extract amounts and units carefully, converting spoken numbers to digits
    - If amounts include fractions like "two and a half", convert to "2 1/2"
    - Separate each instruction into its own step
    - Only include fields that were actually mentioned
    - Be generous in interpreting pauses and speech patterns`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: transcript
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Parse the JSON response
    let extractedData;
    try {
      // Find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error('Failed to parse recipe information');
    }

    // Validate and clean the extracted data
    const recipe = {
      title: extractedData.title || 'Untitled Recipe',
      description: extractedData.description || undefined,
      ingredients: Array.isArray(extractedData.ingredients) ? extractedData.ingredients : [],
      instructions: Array.isArray(extractedData.instructions) ? extractedData.instructions : [],
      prepTime: extractedData.prepTime ? Number(extractedData.prepTime) : undefined,
      cookTime: extractedData.cookTime ? Number(extractedData.cookTime) : undefined,
      servings: extractedData.servings ? Number(extractedData.servings) : undefined,
      sourceName: extractedData.sourceName || undefined,
      sourceNotes: extractedData.sourceNotes || undefined,
    };

    return NextResponse.json({ 
      recipe,
      transcript // Return the original transcript for reference
    });
  } catch (error) {
    console.error('Error processing voice recipe:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'Voice processing service not configured' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process voice input' },
      { status: 500 }
    );
  }
}