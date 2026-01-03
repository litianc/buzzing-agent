// Buzzing Agent - Sky News Data Fetcher (RSS)

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import { truncateToMinute } from '@/lib/utils';
import Parser from 'rss-parser';

const SKYNEWS_RSS_FEEDS = [
  'https://feeds.skynews.com/feeds/rss/home.xml',
  'https://feeds.skynews.com/feeds/rss/uk.xml',
  'https://feeds.skynews.com/feeds/rss/world.xml',
  'https://feeds.skynews.com/feeds/rss/business.xml',
  'https://feeds.skynews.com/feeds/rss/technology.xml',
];
const DEFAULT_MAX_POSTS = 300;

const parser = new Parser({
  customFields: {
    item: ['enclosure'],
  },
});

function extractThumbnailUrl(item: Record<string, unknown>): string | null {
  try {
    const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
    if (enclosure?.url && enclosure.type?.startsWith('image/')) {
      return enclosure.url;
    }
    return null;
  } catch {
    return null;
  }
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'news.sky.com'; }
}

function generateExternalId(url: string): string {
  const match = url.match(/\/(\d+)$/);
  return match ? match[1] : url.replace(/[^a-zA-Z0-9]/g, '-').slice(-50);
}

async function cleanupOldPosts(sourceId: string, maxPosts: number): Promise<number> {
  const allPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.sourceId, sourceId)).orderBy(desc(posts.publishedAt));
  if (allPosts.length <= maxPosts) return 0;
  const toDelete = allPosts.slice(maxPosts).map(p => p.id);
  if (toDelete.length > 0) await db.delete(posts).where(inArray(posts.id, toDelete));
  return toDelete.length;
}

export async function fetchSkyNews(options: { limit?: number; translate?: boolean } = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { limit = 30, translate = true } = options;

  try {
    let source = await db.query.sources.findFirst({ where: eq(sources.name, 'skynews') });
    if (!source) {
      const [created] = await db.insert(sources).values({
        name: 'skynews', displayName: 'Sky News', description: '英国天空新闻，全球实时报道',
        apiEndpoint: SKYNEWS_RSS_FEEDS[0], minScore: 0, maxPosts: DEFAULT_MAX_POSTS, isActive: true,
      }).returning();
      source = created;
    }

    // Fetch from all feeds in parallel
    const feedResults = await Promise.all(
      SKYNEWS_RSS_FEEDS.map(url => parser.parseURL(url).catch(() => ({ items: [] })))
    );

    // Combine and deduplicate items by link
    const seenLinks = new Set<string>();
    type FeedItem = { enclosure?: { url?: string } } & Parser.Item;
    const allItems: FeedItem[] = [];
    for (const feed of feedResults) {
      for (const item of feed.items) {
        if (item.link && !seenLinks.has(item.link)) {
          seenLinks.add(item.link);
          allItems.push(item);
        }
      }
    }

    // Sort by pubDate descending and take limit
    allItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });
    const items = allItems.slice(0, limit);
    let newPostsCount = 0;

    for (const item of items) {
      if (!item.link || !item.title) continue;
      const externalId = generateExternalId(item.link);
      const existing = await db.query.posts.findFirst({ where: and(eq(posts.sourceId, source.id), eq(posts.externalId, externalId)) });
      if (existing) continue;

      const postData: NewPost = {
        sourceId: source.id, externalId, titleOriginal: item.title,
        summaryOriginal: item.contentSnippet || null, originalLang: 'en',
        titleEn: item.title, summaryEn: item.contentSnippet || null,
        sourceUrl: item.link, originUrl: item.link, sourceDomain: extractDomain(item.link),
        thumbnailUrl: extractThumbnailUrl(item as Record<string, unknown>),
        score: 0, tags: [],
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
    await db.insert(fetchLogs).values({ sourceName: 'skynews', status: 'success', itemsCount: newPostsCount, duration });
    return { count: items.length, newPosts: newPostsCount, deleted: deletedCount, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    await db.insert(fetchLogs).values({ sourceName: 'skynews', status: 'failed', itemsCount: 0, errorMsg: error instanceof Error ? error.message : 'Unknown', duration });
    throw error;
  }
}
