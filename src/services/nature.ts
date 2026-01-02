// Buzzing Agent - Nature Data Fetcher (RSS)

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import { truncateToMinute } from '@/lib/utils';
import Parser from 'rss-parser';

const NATURE_RSS_URL = 'https://www.nature.com/nature.rss';
const DEFAULT_MAX_POSTS = 300;

const parser = new Parser();

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'nature.com';
  }
}

function generateExternalId(url: string): string {
  const match = url.match(/\/articles?\/([\w-]+)/);
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

export async function fetchNature(options: { limit?: number; translate?: boolean } = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { limit = 30, translate = true } = options;

  try {
    let source = await db.query.sources.findFirst({ where: eq(sources.name, 'nature') });
    if (!source) {
      const [created] = await db.insert(sources).values({
        name: 'nature', displayName: 'Nature', description: '顶级科学期刊，发布最新科研成果',
        apiEndpoint: NATURE_RSS_URL, minScore: 0, maxPosts: DEFAULT_MAX_POSTS, isActive: true,
      }).returning();
      source = created;
    }

    const feed = await parser.parseURL(NATURE_RSS_URL);
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
        sourceId: source.id, externalId, titleOriginal: item.title,
        summaryOriginal: item.contentSnippet || null, originalLang: 'en',
        titleEn: item.title, summaryEn: item.contentSnippet || null,
        sourceUrl: item.link, originUrl: item.link, sourceDomain: extractDomain(item.link),
        author: item.creator || null, score: 0, tags: [],
        publishedAt: truncateToMinute(item.pubDate || new Date()),
      };

      if (translate) {
        try {
          const translations = await translatePostToAllLocales({ titleOriginal: postData.titleOriginal!, summaryOriginal: postData.summaryOriginal, originalLang: 'en' });
          postData.translations = translations; postData.isTranslated = true; postData.translatedAt = new Date();
        } catch (e) { console.error(`Translation failed: ${postData.titleOriginal}`, e); }
      }

      await db.insert(posts).values(postData);
      newPostsCount++;
    }

    const deletedCount = await cleanupOldPosts(source.id, source.maxPosts || DEFAULT_MAX_POSTS);
    const duration = Date.now() - startTime;
    await db.insert(fetchLogs).values({ sourceName: 'nature', status: 'success', itemsCount: newPostsCount, duration });
    return { count: items.length, newPosts: newPostsCount, deleted: deletedCount, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    await db.insert(fetchLogs).values({ sourceName: 'nature', status: 'failed', itemsCount: 0, errorMsg: error instanceof Error ? error.message : 'Unknown', duration });
    throw error;
  }
}
