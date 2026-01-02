// Buzzing Agent - Ars Technica Data Fetcher
// RSS: https://feeds.arstechnica.com/arstechnica/index

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import { truncateToMinute } from '@/lib/utils';
import Parser from 'rss-parser';

const ARSTECHNICA_RSS_URL = 'https://feeds.arstechnica.com/arstechnica/index';
const DEFAULT_MAX_POSTS = 300;

const parser = new Parser({
  customFields: {
    item: [
      ['dc:creator', 'creator'],
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
    ],
  },
});

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'arstechnica.com';
  }
}

// Generate a stable ID from URL
function generateExternalId(url: string): string {
  // Extract the article slug from URL
  const match = url.match(/\/([^/]+)\/?$/);
  return match ? match[1] : url.replace(/[^a-zA-Z0-9]/g, '-');
}

// Extract thumbnail URL from media:content
function extractThumbnailUrl(item: Record<string, unknown>): string | null {
  try {
    const mediaContent = item.mediaContent as Record<string, unknown> | undefined;
    if (!mediaContent) return null;

    // Try to get thumbnail first (smaller size, better for display)
    const mediaThumbnail = mediaContent['media:thumbnail'] as Array<{ $?: { url?: string } }> | undefined;
    if (mediaThumbnail?.[0]?.$?.url) {
      return mediaThumbnail[0].$.url;
    }

    // Fall back to main image
    const attrs = mediaContent.$ as { url?: string } | undefined;
    return attrs?.url || null;
  } catch {
    return null;
  }
}

// Cleanup old posts to stay within maxPosts limit
async function cleanupOldPosts(sourceId: string, maxPosts: number): Promise<number> {
  const allPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.sourceId, sourceId))
    .orderBy(desc(posts.publishedAt));

  if (allPosts.length <= maxPosts) {
    return 0;
  }

  const postsToDelete = allPosts.slice(maxPosts).map(p => p.id);

  if (postsToDelete.length > 0) {
    await db.delete(posts).where(inArray(posts.id, postsToDelete));
  }

  return postsToDelete.length;
}

// Main Ars Technica fetcher
export async function fetchArsTechnica(options: {
  limit?: number;
  translate?: boolean;
} = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { limit = 50, translate = true } = options;

  try {
    // Get or create Ars Technica source
    let arsSource = await db.query.sources.findFirst({
      where: eq(sources.name, 'arstechnica'),
    });

    if (!arsSource) {
      const [created] = await db.insert(sources).values({
        name: 'arstechnica',
        displayName: 'Ars Technica',
        description: '深度科技新闻与评测，覆盖科技、科学、政策等领域',
        apiEndpoint: ARSTECHNICA_RSS_URL,
        minScore: 0,
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      arsSource = created;
    }

    // Fetch RSS feed
    const feed = await parser.parseURL(ARSTECHNICA_RSS_URL);
    const items = feed.items.slice(0, limit);

    // Process and save posts
    let newPostsCount = 0;

    for (const item of items) {
      if (!item.link || !item.title) continue;

      const externalId = generateExternalId(item.link);

      // Check if post already exists
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.sourceId, arsSource.id),
          eq(posts.externalId, externalId)
        ),
      });

      if (existing) {
        continue;
      }

      // Extract categories/tags
      const tags: string[] = [];
      if (item.categories) {
        tags.push(...item.categories.slice(0, 5));
      }

      // Prepare new post
      const postData: NewPost = {
        sourceId: arsSource.id,
        externalId,
        titleOriginal: item.title,
        summaryOriginal: item.contentSnippet || item.content?.substring(0, 300) || null,
        originalLang: 'en',
        titleEn: item.title,
        summaryEn: item.contentSnippet || null,
        sourceUrl: item.link,
        originUrl: item.link,
        sourceDomain: extractDomain(item.link),
        thumbnailUrl: extractThumbnailUrl(item as Record<string, unknown>),
        author: (item['dc:creator'] || item.creator || '').trim() || null,
        score: 0, // RSS doesn't have scores
        tags,
        publishedAt: truncateToMinute(item.pubDate || new Date()),
      };

      // Translate if enabled
      if (translate) {
        try {
          const translations = await translatePostToAllLocales({
            titleOriginal: postData.titleOriginal!,
            summaryOriginal: postData.summaryOriginal,
            originalLang: 'en',
          });
          postData.translations = translations;
          postData.isTranslated = true;
          postData.translatedAt = new Date();
        } catch (error) {
          console.error(`Failed to translate: ${postData.titleOriginal}`, error);
        }
      }

      // Insert new post
      await db.insert(posts).values(postData);
      newPostsCount++;
    }

    // Cleanup old posts
    const maxPosts = arsSource.maxPosts || DEFAULT_MAX_POSTS;
    const deletedCount = await cleanupOldPosts(arsSource.id, maxPosts);

    const duration = Date.now() - startTime;

    // Log fetch result
    await db.insert(fetchLogs).values({
      sourceName: 'arstechnica',
      status: 'success',
      itemsCount: newPostsCount,
      duration,
    });

    return {
      count: items.length,
      newPosts: newPostsCount,
      deleted: deletedCount,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await db.insert(fetchLogs).values({
      sourceName: 'arstechnica',
      status: 'failed',
      itemsCount: 0,
      errorMsg,
      duration,
    });

    throw error;
  }
}
