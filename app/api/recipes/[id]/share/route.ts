import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { shareLinks, recipes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if recipe exists and belongs to user
    const recipe = await db.query.recipes.findFirst({
      where: and(
        eq(recipes.id, id),
        eq(recipes.createdBy, user.id)
      ),
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found or access denied' }, { status: 404 });
    }

    // Check if share link already exists
    const existingShareLink = await db.query.shareLinks.findFirst({
      where: and(
        eq(shareLinks.recipeId, id),
        eq(shareLinks.createdBy, user.id)
      ),
    });

    if (existingShareLink) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
      const shareUrl = baseUrl ? `${baseUrl}/share/${existingShareLink.token}` : `/share/${existingShareLink.token}`;
      return NextResponse.json({ 
        shareUrl,
        token: existingShareLink.token 
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(12).toString('base64url');

    // Create share link
    const [newShareLink] = await db
      .insert(shareLinks)
      .values({
        recipeId: id,
        token,
        createdBy: user.id,
      })
      .returning();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
    const shareUrl = baseUrl ? `${baseUrl}/share/${newShareLink.token}` : `/share/${newShareLink.token}`;
    return NextResponse.json({ 
      shareUrl,
      token: newShareLink.token 
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get share link for recipe
    const shareLink = await db.query.shareLinks.findFirst({
      where: and(
        eq(shareLinks.recipeId, id),
        eq(shareLinks.createdBy, user.id)
      ),
    });

    if (!shareLink) {
      return NextResponse.json({ shareLink: null });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
    const shareUrl = baseUrl ? `${baseUrl}/share/${shareLink.token}` : `/share/${shareLink.token}`;
    return NextResponse.json({ 
      shareUrl,
      token: shareLink.token,
      createdAt: shareLink.createdAt,
      viewCount: shareLink.viewCount,
      lastViewedAt: shareLink.lastViewedAt,
    });
  } catch (error) {
    console.error('Error fetching share link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete share link
    await db
      .delete(shareLinks)
      .where(
        and(
          eq(shareLinks.recipeId, id),
          eq(shareLinks.createdBy, user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting share link:', error);
    return NextResponse.json(
      { error: 'Failed to delete share link' },
      { status: 500 }
    );
  }
}