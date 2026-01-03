// Buzzing Agent - Lobsters Data Fetcher
// API: https://lobste.rs/hottest.json

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import { truncateToMinute } from '@/lib/utils';

const LOBSTERS_API_BASE = 'https://lobste.rs';
const DEFAULT_MAX_POSTS = 300;

interface LobstersStory {
  short_id: string;
  created_at: string;
  title: string;
  url: string;
  score: number;
  flags: number;
  comment_count: number;
  description: string;
  description_plain: string;
  submitter_user: string;
  user_is_author: boolean;
  tags: string[];
  short_id_url: string;
  comments_url: string;
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'lobste.rs';
  }
}

// Fetch hottest stories from Lobsters
async function fetchHottestStories(): Promise<LobstersStory[]> {
  const response = await fetch(`${LOBSTERS_API_BASE}/hottest.json`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Lobsters stories: ${response.status}`);
  }

  return await response.json();
}

// Fetch newest stories from Lobsters
async function fetchNewestStories(): Promise<LobstersStory[]> {
  const response = await fetch(`${LOBSTERS_API_BASE}/newest.json`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Lobsters newest: ${response.status}`);
  }

  return await response.json();
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

// Main Lobsters fetcher
export async function fetchLobsters(options: {
  type?: 'hottest' | 'newest';
  limit?: number;
  minScore?: number;
  translate?: boolean;
} = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { type = 'hottest', limit = 50, minScore = 5, translate = true } = options;

  try {
    // Get or create Lobsters source
    let lobstersSource = await db.query.sources.findFirst({
      where: eq(sources.name, 'lobsters'),
    });

    if (!lobstersSource) {
      const [created] = await db.insert(sources).values({
        name: 'lobsters',
        displayName: 'Lobsters',
        description: '专注于技术的链接聚合社区，由程序员运营',
        apiEndpoint: LOBSTERS_API_BASE,
        minScore,
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      lobstersSource = created;
    }

    // Fetch stories
    const stories = type === 'newest'
      ? await fetchNewestStories()
      : await fetchHottestStories();

    // Filter and limit
    const validStories = stories
      .filter(story => story.score >= minScore)
      .slice(0, limit);

    // Process and save posts
    let newPostsCount = 0;

    for (const story of validStories) {
      const externalId = story.short_id;

      // Check if post already exists
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.sourceId, lobstersSource.id),
          eq(posts.externalId, externalId)
        ),
      });

      if (existing) {
        // Update score only if increased by more than 10
        if (story.score - (existing.score || 0) > 10) {
          await db.update(posts)
            .set({ score: story.score, updatedAt: new Date() })
            .where(eq(posts.id, existing.id));
        }
        continue;
      }

      // Prepare new post
      const sourceUrl = story.url || story.comments_url;
      const postData: NewPost = {
        sourceId: lobstersSource.id,
        externalId,
        titleOriginal: story.title,
        summaryOriginal: story.description_plain || null,
        originalLang: 'en',
        titleEn: story.title,
        summaryEn: story.description_plain || null,
        sourceUrl,
        originUrl: story.comments_url,
        sourceDomain: extractDomain(sourceUrl),
        author: story.submitter_user,
        authorUrl: `https://lobste.rs/~${story.submitter_user}`,
        score: story.score,
        tags: story.tags || [],
        publishedAt: truncateToMinute(story.created_at),
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
    const maxPosts = lobstersSource.maxPosts || DEFAULT_MAX_POSTS;
    const deletedCount = await cleanupOldPosts(lobstersSource.id, maxPosts);

    const duration = Date.now() - startTime;

    // Log fetch result
    await db.insert(fetchLogs).values({
      sourceName: 'lobsters',
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
      sourceName: 'lobsters',
      status: 'failed',
      itemsCount: 0,
      errorMsg,
      duration,
    });

    throw error;
  }
}
