// Buzzing Agent - The Guardian Data Fetcher
// API: https://open-platform.theguardian.com/

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import { truncateToMinute } from '@/lib/utils';

const GUARDIAN_API_BASE = 'https://content.guardianapis.com';
const DEFAULT_MAX_POSTS = 300;

interface GuardianArticle {
  id: string;
  type: string;
  sectionId: string;
  sectionName: string;
  webPublicationDate: string;
  webTitle: string;
  webUrl: string;
  apiUrl: string;
  isHosted: boolean;
  pillarId?: string;
  pillarName?: string;
  fields?: {
    thumbnail?: string;
    trailText?: string;
  };
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'theguardian.com';
  }
}

// Generate external ID from Guardian ID
function generateExternalId(guardianId: string): string {
  return guardianId.replace(/\//g, '-');
}

// Cleanup old posts
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

// Main Guardian fetcher
export async function fetchGuardian(options: {
  limit?: number;
  translate?: boolean;
} = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { limit = 30, translate = true } = options;

  // Use environment variable or fallback to test key
  const apiKey = process.env.GUARDIAN_API_KEY || 'test';

  try {
    // Get or create Guardian source
    let guardianSource = await db.query.sources.findFirst({
      where: eq(sources.name, 'guardian'),
    });

    if (!guardianSource) {
      const [created] = await db.insert(sources).values({
        name: 'guardian',
        displayName: 'The Guardian',
        description: '英国卫报，全球视野的新闻报道',
        apiEndpoint: GUARDIAN_API_BASE,
        minScore: 0,
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      guardianSource = created;
    }

    // Fetch articles from Guardian API
    const response = await fetch(
      `${GUARDIAN_API_BASE}/search?api-key=${apiKey}&page-size=${limit}&order-by=newest&show-fields=thumbnail,trailText`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`Guardian API error: ${response.status}`);
    }

    const data = await response.json();
    const articles: GuardianArticle[] = data.response?.results || [];

    // Process and save posts
    let newPostsCount = 0;

    for (const article of articles) {
      const externalId = generateExternalId(article.id);

      // Check if exists
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.sourceId, guardianSource.id),
          eq(posts.externalId, externalId)
        ),
      });

      if (existing) continue;

      // Prepare post
      const postData: NewPost = {
        sourceId: guardianSource.id,
        externalId,
        titleOriginal: article.webTitle,
        summaryOriginal: article.fields?.trailText || null,
        originalLang: 'en',
        titleEn: article.webTitle,
        summaryEn: article.fields?.trailText || null,
        sourceUrl: article.webUrl,
        originUrl: article.webUrl,
        sourceDomain: extractDomain(article.webUrl),
        thumbnailUrl: article.fields?.thumbnail || null,
        score: 0,
        tags: [article.sectionName].filter(Boolean),
        publishedAt: truncateToMinute(article.webPublicationDate),
      };

      // Translate
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

      await db.insert(posts).values(postData);
      newPostsCount++;
    }

    // Cleanup
    const deletedCount = await cleanupOldPosts(guardianSource.id, guardianSource.maxPosts || DEFAULT_MAX_POSTS);
    const duration = Date.now() - startTime;

    await db.insert(fetchLogs).values({
      sourceName: 'guardian',
      status: 'success',
      itemsCount: newPostsCount,
      duration,
    });

    return { count: articles.length, newPosts: newPostsCount, deleted: deletedCount, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    await db.insert(fetchLogs).values({
      sourceName: 'guardian',
      status: 'failed',
      itemsCount: 0,
      errorMsg: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
    throw error;
  }
}
