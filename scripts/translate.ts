#!/usr/bin/env npx tsx
/**
 * Standalone translate script for Buzzing Agent
 * Translates pending posts that haven't been translated yet
 *
 * Usage: npx tsx scripts/translate.ts [limit]
 * Or: npm run script:translate
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env BEFORE any other imports
// Try current directory first, then parent directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function main() {
  // Dynamic imports to ensure env vars are loaded first
  const { db, posts } = await import('../src/db');
  const { eq, or, isNull, desc } = await import('drizzle-orm');
  const { translatePostToAllLocales } = await import('../src/services/translate');

  const limit = parseInt(process.argv[2] || '50', 10);
  console.log(`🌐 Starting translation (limit: ${limit})...\n`);
  const startTime = Date.now();

  // Find posts that need translation
  const pendingPosts = await db
    .select({
      id: posts.id,
      titleOriginal: posts.titleOriginal,
      titleEn: posts.titleEn,
      summaryOriginal: posts.summaryOriginal,
      summaryEn: posts.summaryEn,
      originalLang: posts.originalLang,
    })
    .from(posts)
    .where(or(eq(posts.isTranslated, false), isNull(posts.isTranslated)))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  console.log(`📝 Found ${pendingPosts.length} posts to translate\n`);

  let translatedCount = 0;
  let failedCount = 0;

  for (const post of pendingPosts) {
    const title = post.titleOriginal || post.titleEn || '';
    const summary = post.summaryOriginal || post.summaryEn;
    const originalLang = post.originalLang || 'en';

    if (!title) {
      console.log(`⏭️  Skipping post ${post.id}: no title`);
      continue;
    }

    try {
      const translations = await translatePostToAllLocales({
        titleOriginal: title,
        summaryOriginal: summary,
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
      console.log(`✅ [${translatedCount}/${pendingPosts.length}] ${title.slice(0, 50)}...`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failedCount++;
      console.log(`❌ Failed: ${title.slice(0, 50)}... - ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log('\n📊 Summary:');
  console.log(`   Translated: ${translatedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);

  process.exit(failedCount === 0 ? 0 : 1);
}

main().catch(console.error);
