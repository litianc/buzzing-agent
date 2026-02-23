// Buzzing Agent - Quesma Blog Data Fetcher (RSS)

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { truncateToMinute } from '@/lib/utils';
import Parser from 'rss-parser';

const QUESMA_RSS_URL = 'https://quesma.com/rss.xml';
const DEFAULT_MAX_POSTS = 300;

const parser = new Parser();

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'quesma.com';
  }
}

function generateExternalId(url: string): string {
  const match = url.match(/\/blog\/(.+?)\/?(?:\?|$)/);
  return match ? match[1] : url.replace(/[^a-zA-Z0-9]/g, '-').slice(-50);
}

async function cleanupOldPosts(sourceId: string, maxPosts: number): Promise<number> {
  const allPosts = await db.select({ id: posts.id }).from(posts)
    .where(eq(posts.sourceId, sourceId)).orderBy(desc(posts.publishedAt));
  if (allPosts.length <= maxPosts) return 0;
  const toDelete = allPosts.slice(maxPosts).map(p => p.id);
  if (toDelete.length > 0) await db.delete(posts).where(inArray(posts.id, toDelete));
  return toDelete.length;
}

export async function fetchQuesma(options: { limit?: number } = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { limit = 30 } = options;

  try {
    let source = await db.query.sources.findFirst({ where: eq(sources.name, 'quesma') });
    if (!source) {
      const [created] = await db.insert(sources).values({
        name: 'quesma',
        displayName: 'Quesma',
        description: 'Insights on AI agent evaluation, LLM benchmarking, and simulation environments',
        apiEndpoint: QUESMA_RSS_URL,
        minScore: 0,
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      source = created;
    }

    const feed = await parser.parseURL(QUESMA_RSS_URL);
    const items = feed.items.slice(0, limit);
    let newPostsCount = 0;

    for (const item of items) {
      if (!item.link || !item.title) continue;
      const externalId = generateExternalId(item.link);

      const existing = await db.query.posts.findFirst({
        where: and(eq(posts.sourceId, source.id), eq(posts.externalId, externalId)),
      });
      if (existing) continue;

      const postData: NewPost = {
        sourceId: source.id,
        externalId,
        titleOriginal: item.title,
        summaryOriginal: item.contentSnippet || null,
        originalLang: 'en',
        titleEn: null,
        summaryEn: null,
        sourceUrl: item.link,
        originUrl: item.link,
        sourceDomain: extractDomain(item.link),
        thumbnailUrl: null,
        author: item.author || 'Quesma',
        score: 0,
        tags: item.categories || [],
        publishedAt: truncateToMinute(item.pubDate || new Date()),
        isTranslated: false,
      };

      await db.insert(posts).values(postData);
      newPostsCount++;
    }

    const deletedCount = await cleanupOldPosts(source.id, source.maxPosts || DEFAULT_MAX_POSTS);
    const duration = Date.now() - startTime;
    await db.insert(fetchLogs).values({ sourceName: 'quesma', status: 'success', itemsCount: newPostsCount, duration });
    return { count: items.length, newPosts: newPostsCount, deleted: deletedCount, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    await db.insert(fetchLogs).values({ sourceName: 'quesma', status: 'failed', itemsCount: 0, errorMsg: error instanceof Error ? error.message : 'Unknown', duration });
    throw error;
  }
}
