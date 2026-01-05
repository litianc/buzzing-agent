// Buzzing Agent - Translate Pending Posts
// Translates posts that haven't been translated yet

import { NextResponse } from 'next/server';
import { db, posts } from '@/db';
import { eq, isNull, or, desc } from 'drizzle-orm';
import { translatePostToAllLocales } from '@/services/translate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  // Get limit from query params (default 50)
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  try {
    // Find posts that need translation
    const pendingPosts = await db
      .select({
        id: posts.id,
        titleOriginal: posts.titleOriginal,
        summaryOriginal: posts.summaryOriginal,
        originalLang: posts.originalLang,
      })
      .from(posts)
      .where(
        or(
          eq(posts.isTranslated, false),
          isNull(posts.isTranslated)
        )
      )
      .orderBy(desc(posts.publishedAt))
      .limit(limit);

    if (pendingPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending translations',
        translated: 0,
        duration: Date.now() - startTime,
      });
    }

    let translatedCount = 0;
    let errorCount = 0;

    // Translate each post
    for (const post of pendingPosts) {
      try {
        const translations = await translatePostToAllLocales({
          titleOriginal: post.titleOriginal!,
          summaryOriginal: post.summaryOriginal,
          originalLang: post.originalLang || 'en',
        });

        await db.update(posts)
          .set({
            translations,
            isTranslated: true,
            translatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(posts.id, post.id));

        translatedCount++;
      } catch (error) {
        console.error(`Failed to translate post ${post.id}:`, error);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Translated ${translatedCount}/${pendingPosts.length} posts`,
      pending: pendingPosts.length,
      translated: translatedCount,
      errors: errorCount,
      duration,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
