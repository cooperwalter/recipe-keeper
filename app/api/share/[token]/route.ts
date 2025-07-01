import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shareLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Find share link by token
    const shareLink = await db.query.shareLinks.findFirst({
      where: eq(shareLinks.token, token),
      with: {
        recipe: {
          with: {
            ingredients: {
              orderBy: (ingredients, { asc }) => [asc(ingredients.orderIndex)],
            },
            instructions: {
              orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
            },
            photos: true,
          },
        },
        creator: true,
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if link has expired
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Update view count and last viewed time
    await db
      .update(shareLinks)
      .set({
        viewCount: shareLink.viewCount + 1,
        lastViewedAt: new Date(),
      })
      .where(eq(shareLinks.id, shareLink.id));

    // Return recipe data (excluding sensitive information)
    const { recipe, creator } = shareLink;
    return NextResponse.json({
      recipe: {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        sourceName: recipe.sourceName,
        sourceNotes: recipe.sourceNotes,
        badges: recipe.badges,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        photos: recipe.photos.map(photo => ({
          id: photo.id,
          photoUrl: photo.photoUrl,
          caption: photo.caption,
          isOriginal: photo.isOriginal,
        })),
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      },
      sharedBy: creator?.name || 'Anonymous',
    });
  } catch (error) {
    console.error('Error fetching shared recipe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared recipe' },
      { status: 500 }
    );
  }
}