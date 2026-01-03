// Buzzing Agent - Ask HN Data Fetcher (reuses HN API)

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import { truncateToMinute } from '@/lib/utils';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const DEFAULT_MAX_POSTS = 300;

interface HNItem {
  id: number; type: string; by?: string; time: number;
  title?: string; text?: string; score?: number;
  deleted?: boolean; dead?: boolean;
}

async function fetchHNItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${HN_API_BASE}/item/${id}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function cleanupOldPosts(sourceId: string, maxPosts: number): Promise<number> {
  const allPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.sourceId, sourceId)).orderBy(desc(posts.publishedAt));
  if (allPosts.length <= maxPosts) return 0;
  const toDelete = allPosts.slice(maxPosts).map(p => p.id);
  if (toDelete.length > 0) await db.delete(posts).where(inArray(posts.id, toDelete));
  return toDelete.length;
}

export async function fetchAskHN(options: { limit?: number; minScore?: number; translate?: boolean } = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { limit = 30, minScore = 10, translate = true } = options;

  try {
    let source = await db.query.sources.findFirst({ where: eq(sources.name, 'askhn') });
    if (!source) {
      const [created] = await db.insert(sources).values({
        name: 'askhn', displayName: 'Ask HN', description: 'Hacker News 问答区，技术问题与职业讨论',
        apiEndpoint: HN_API_BASE, minScore, maxPosts: DEFAULT_MAX_POSTS, isActive: true,
      }).returning();
      source = created;
    }

    const res = await fetch(`${HN_API_BASE}/askstories.json`);
    const storyIds: number[] = await res.json();
    const items: HNItem[] = [];

    for (let i = 0; i < Math.min(limit, storyIds.length); i += 10) {
      const batch = storyIds.slice(i, i + 10);
      const results = await Promise.all(batch.map(fetchHNItem));
      items.push(...results.filter((item): item is HNItem => item !== null));
    }

    const validStories = items.filter(item => item.type === 'story' && !item.deleted && !item.dead && item.title && (item.score || 0) >= minScore);
    let newPostsCount = 0;

    for (const item of validStories) {
      const externalId = String(item.id);
      const existing = await db.query.posts.findFirst({ where: and(eq(posts.sourceId, source.id), eq(posts.externalId, externalId)) });
      if (existing) {
        // Update score only if increased by more than 30
        if (item.score && item.score - (existing.score || 0) > 30) {
          await db.update(posts).set({ score: item.score, updatedAt: new Date() }).where(eq(posts.id, existing.id));
        }
        continue;
      }

      const postData: NewPost = {
        sourceId: source.id, externalId, titleOriginal: item.title!, originalLang: 'en', titleEn: item.title!,
        summaryOriginal: item.text?.substring(0, 500) || null, summaryEn: item.text?.substring(0, 500) || null,
        sourceUrl: `https://news.ycombinator.com/item?id=${item.id}`,
        originUrl: `https://news.ycombinator.com/item?id=${item.id}`,
        sourceDomain: 'news.ycombinator.com', author: item.by || null,
        authorUrl: item.by ? `https://news.ycombinator.com/user?id=${item.by}` : null,
        score: item.score || 0, tags: ['Ask HN'], publishedAt: truncateToMinute(item.time * 1000),
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
    await db.insert(fetchLogs).values({ sourceName: 'askhn', status: 'success', itemsCount: newPostsCount, duration });
    return { count: validStories.length, newPosts: newPostsCount, deleted: deletedCount, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    await db.insert(fetchLogs).values({ sourceName: 'askhn', status: 'failed', itemsCount: 0, errorMsg: error instanceof Error ? error.message : 'Unknown', duration });
    throw error;
  }
}
