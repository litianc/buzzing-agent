// Buzzing Agent - Translate Pending Posts API
// Translates posts that don't have translations yet

import { NextResponse } from 'next/server';
import { db, posts, type Locale } from '@/db';
import { eq, or, isNull } from 'drizzle-orm';
import { translatePostToAllLocales } from '@/services/translate';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for translation

export async function GET() {
  const startTime = Date.now();

  try {
    // Find posts without translations
    const pendingPosts = await db.query.posts.findMany({
      where: or(
        eq(posts.isTranslated, false),
        isNull(posts.translations)
      ),
      limit: 20, // Process 20 posts at a time
      orderBy: (posts, { desc }) => [desc(posts.score)],
    });

    if (pendingPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts need translation',
        translated: 0,
        duration: Date.now() - startTime,
      });
    }

    let translatedCount = 0;
    const errors: string[] = [];

    for (const post of pendingPosts) {
      try {
        // 使用新字段，如果不存在则回退到旧字段
        const titleOriginal = post.titleOriginal || post.titleEn || '';
        const summaryOriginal = post.summaryOriginal || post.summaryEn;
        const originalLang = (post.originalLang || 'en') as Locale;

        if (!titleOriginal) {
          errors.push(`Post ${post.id}: No title to translate`);
          continue;
        }

        const translations = await translatePostToAllLocales({
          titleOriginal,
          summaryOriginal,
          originalLang,
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

        // Small delay between translations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Post ${post.id}: ${errorMsg}`);
        console.error(`Failed to translate post ${post.id}:`, error);
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Translated ${translatedCount} of ${pendingPosts.length} posts`,
      translated: translatedCount,
      pending: pendingPosts.length - translatedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration,
    });
  } catch (error) {
    console.error('Translation API error:', error);
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
