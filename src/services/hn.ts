// Buzzing Agent - Hacker News Data Fetcher
// API: https://github.com/HackerNews/API

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import { truncateToMinute } from '@/lib/utils';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const DEFAULT_MAX_POSTS = 300;

interface HNItem {
  id: number;
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by?: string;
  time: number;
  title?: string;
  text?: string;
  url?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
  deleted?: boolean;
  dead?: boolean;
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'news.ycombinator.com';
  }
}

// Detect tags from HN title
function detectTags(title: string): string[] {
  const tags: string[] = [];

  if (title.startsWith('Show HN:')) tags.push('Show HN');
  else if (title.startsWith('Ask HN:')) tags.push('Ask HN');
  else if (title.startsWith('Tell HN:')) tags.push('Tell HN');
  else if (title.startsWith('Launch HN:')) tags.push('Launch HN');

  if (title.includes('[video]')) tags.push('Video');
  if (title.includes('[pdf]')) tags.push('PDF');

  return tags;
}

// Fetch single HN item by ID
async function fetchHNItem(id: number): Promise<HNItem | null> {
  try {
    const response = await fetch(`${HN_API_BASE}/item/${id}.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch HN item ${id}:`, error);
    return null;
  }
}

// Fetch top story IDs
async function fetchTopStories(): Promise<number[]> {
  const response = await fetch(`${HN_API_BASE}/topstories.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch top stories: ${response.status}`);
  }
  return await response.json();
}

// Fetch new story IDs
async function fetchNewStories(): Promise<number[]> {
  const response = await fetch(`${HN_API_BASE}/newstories.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch new stories: ${response.status}`);
  }
  return await response.json();
}

// Fetch best story IDs
async function fetchBestStories(): Promise<number[]> {
  const response = await fetch(`${HN_API_BASE}/beststories.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch best stories: ${response.status}`);
  }
  return await response.json();
}

// Cleanup old posts to stay within maxPosts limit
async function cleanupOldPosts(sourceId: string, maxPosts: number): Promise<number> {
  // Get all post IDs for this source, ordered by publishedAt desc
  const allPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.sourceId, sourceId))
    .orderBy(desc(posts.publishedAt));

  if (allPosts.length <= maxPosts) {
    return 0;
  }

  // Get IDs of posts to delete (those beyond maxPosts)
  const postsToDelete = allPosts.slice(maxPosts).map(p => p.id);

  if (postsToDelete.length > 0) {
    await db.delete(posts).where(inArray(posts.id, postsToDelete));
  }

  return postsToDelete.length;
}

// Main HN fetcher
export async function fetchHackerNews(options: {
  type?: 'top' | 'new' | 'best';
  limit?: number;
  minScore?: number;
  translate?: boolean;
} = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { type = 'top', limit = 100, minScore = 100, translate = true } = options;

  try {
    // Get or create HN source
    let hnSource = await db.query.sources.findFirst({
      where: eq(sources.name, 'hn'),
    });

    if (!hnSource) {
      const [created] = await db.insert(sources).values({
        name: 'hn',
        displayName: 'Hacker News',
        description: 'Y Combinator 旗下的科技社区，汇聚全球开发者和创业者的热门讨论',
        apiEndpoint: HN_API_BASE,
        minScore,
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      hnSource = created;
    }

    // Fetch story IDs based on type
    let storyIds: number[];
    switch (type) {
      case 'new':
        storyIds = await fetchNewStories();
        break;
      case 'best':
        storyIds = await fetchBestStories();
        break;
      default:
        storyIds = await fetchTopStories();
    }

    // Limit the number of stories to fetch
    storyIds = storyIds.slice(0, limit);

    // Fetch items in parallel (batched)
    const batchSize = 10;
    const allItems: HNItem[] = [];

    for (let i = 0; i < storyIds.length; i += batchSize) {
      const batch = storyIds.slice(i, i + batchSize);
      const items = await Promise.all(batch.map(fetchHNItem));
      allItems.push(...items.filter((item): item is HNItem => item !== null));
    }

    // Filter by minimum score and valid stories
    const validStories = allItems.filter(item =>
      item.type === 'story' &&
      !item.deleted &&
      !item.dead &&
      item.title &&
      (item.score || 0) >= minScore
    );

    // Process and save posts
    let newPostsCount = 0;

    for (const item of validStories) {
      const externalId = String(item.id);

      // Check if post already exists
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.sourceId, hnSource.id),
          eq(posts.externalId, externalId)
        ),
      });

      if (existing) {
        // Update score if changed significantly
        if (item.score && Math.abs((existing.score || 0) - item.score) > 10) {
          await db.update(posts)
            .set({ score: item.score, updatedAt: new Date() })
            .where(eq(posts.id, existing.id));
        }
        continue;
      }

      // Prepare new post
      const sourceUrl = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
      const postData: NewPost = {
        sourceId: hnSource.id,
        externalId,
        titleOriginal: item.title!,
        originalLang: 'en', // HN content is in English
        titleEn: item.title!, // 兼容旧字段
        sourceUrl,
        sourceDomain: extractDomain(sourceUrl),
        author: item.by || null,
        authorUrl: item.by ? `https://news.ycombinator.com/user?id=${item.by}` : null,
        score: item.score || 0,
        tags: detectTags(item.title!),
        publishedAt: truncateToMinute(item.time * 1000),
      };

      // Translate to all locales if enabled
      if (translate) {
        try {
          const translations = await translatePostToAllLocales({
            titleOriginal: postData.titleOriginal!,
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

    // Cleanup old posts to maintain maxPosts limit
    const maxPosts = hnSource.maxPosts || DEFAULT_MAX_POSTS;
    const deletedCount = await cleanupOldPosts(hnSource.id, maxPosts);

    const duration = Date.now() - startTime;

    // Log fetch result
    await db.insert(fetchLogs).values({
      sourceName: 'hn',
      status: 'success',
      itemsCount: newPostsCount,
      duration,
    });

    return {
      count: validStories.length,
      newPosts: newPostsCount,
      deleted: deletedCount,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await db.insert(fetchLogs).values({
      sourceName: 'hn',
      status: 'failed',
      itemsCount: 0,
      errorMsg,
      duration,
    });

    throw error;
  }
}

// Translate pending posts (for posts that failed initial translation)
export async function translatePendingPosts(limit = 20): Promise<number> {
  const pendingPosts = await db.query.posts.findMany({
    where: eq(posts.isTranslated, false),
    limit,
    orderBy: (posts, { desc }) => [desc(posts.score)],
  });

  let translatedCount = 0;

  for (const post of pendingPosts) {
    try {
      // 使用新字段，如果不存在则回退到旧字段
      const titleOriginal = post.titleOriginal || post.titleEn || '';
      const summaryOriginal = post.summaryOriginal || post.summaryEn;
      const originalLang = post.originalLang || 'en';

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

      // Small delay between translations
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to translate post ${post.id}:`, error);
    }
  }

  return translatedCount;
}
