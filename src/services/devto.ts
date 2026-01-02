// Buzzing Agent - Dev.to Data Fetcher
// API: https://developers.forem.com/api

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import { truncateToMinute } from '@/lib/utils';

const DEVTO_API_BASE = 'https://dev.to/api';
const DEFAULT_MAX_POSTS = 300;

interface DevtoArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  canonical_url: string;
  cover_image: string | null;
  published_at: string;
  public_reactions_count: number;
  comments_count: number;
  tag_list: string[];
  user: {
    name: string;
    username: string;
    profile_image: string;
  };
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'dev.to';
  }
}

// Fetch top articles from Dev.to
async function fetchTopArticles(limit: number = 50): Promise<DevtoArticle[]> {
  // Dev.to API: top=1 means top articles from the past day
  const response = await fetch(
    `${DEVTO_API_BASE}/articles?per_page=${limit}&top=7`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Dev.to articles: ${response.status}`);
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

// Main Dev.to fetcher
export async function fetchDevto(options: {
  limit?: number;
  minScore?: number;
  translate?: boolean;
} = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { limit = 50, minScore = 10, translate = true } = options;

  try {
    // Get or create Dev.to source
    let devtoSource = await db.query.sources.findFirst({
      where: eq(sources.name, 'devto'),
    });

    if (!devtoSource) {
      const [created] = await db.insert(sources).values({
        name: 'devto',
        displayName: 'Dev.to',
        description: '开发者社区，分享编程文章、教程和技术讨论',
        apiEndpoint: DEVTO_API_BASE,
        minScore,
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      devtoSource = created;
    }

    // Fetch articles
    const articles = await fetchTopArticles(limit);

    // Filter by minimum reactions
    const validArticles = articles.filter(
      article => article.public_reactions_count >= minScore
    );

    // Process and save posts
    let newPostsCount = 0;

    for (const article of validArticles) {
      const externalId = String(article.id);

      // Check if post already exists
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.sourceId, devtoSource.id),
          eq(posts.externalId, externalId)
        ),
      });

      if (existing) {
        // Update score if changed significantly
        if (Math.abs((existing.score || 0) - article.public_reactions_count) > 5) {
          await db.update(posts)
            .set({ score: article.public_reactions_count, updatedAt: new Date() })
            .where(eq(posts.id, existing.id));
        }
        continue;
      }

      // Prepare new post
      const postData: NewPost = {
        sourceId: devtoSource.id,
        externalId,
        titleOriginal: article.title,
        summaryOriginal: article.description || null,
        originalLang: 'en',
        titleEn: article.title,
        summaryEn: article.description || null,
        sourceUrl: article.canonical_url || article.url,
        originUrl: article.url,
        sourceDomain: extractDomain(article.canonical_url || article.url),
        thumbnailUrl: article.cover_image || null,
        author: article.user.name || article.user.username,
        authorUrl: `https://dev.to/${article.user.username}`,
        score: article.public_reactions_count,
        tags: article.tag_list || [],
        publishedAt: truncateToMinute(article.published_at),
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
    const maxPosts = devtoSource.maxPosts || DEFAULT_MAX_POSTS;
    const deletedCount = await cleanupOldPosts(devtoSource.id, maxPosts);

    const duration = Date.now() - startTime;

    // Log fetch result
    await db.insert(fetchLogs).values({
      sourceName: 'devto',
      status: 'success',
      itemsCount: newPostsCount,
      duration,
    });

    return {
      count: validArticles.length,
      newPosts: newPostsCount,
      deleted: deletedCount,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await db.insert(fetchLogs).values({
      sourceName: 'devto',
      status: 'failed',
      itemsCount: 0,
      errorMsg,
      duration,
    });

    throw error;
  }
}
