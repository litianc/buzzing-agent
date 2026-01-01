// Buzzing Agent - Reddit Data Fetcher
// Uses Reddit's public JSON API (no auth required)

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';

const REDDIT_API_BASE = 'https://www.reddit.com';
const DEFAULT_MAX_POSTS = 300;

// Popular subreddits to fetch from
const DEFAULT_SUBREDDITS = [
  'technology',
  'programming',
  'webdev',
  'javascript',
  'python',
  'machinelearning',
  'artificial',
  'startups',
  'entrepreneur',
  'science',
];

interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  url: string;
  permalink: string;
  created_utc: number;
  num_comments: number;
  is_self: boolean;
  selftext?: string;
  thumbnail?: string;
  domain: string;
  link_flair_text?: string;
  over_18: boolean;
  stickied: boolean;
}

interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
    after?: string;
  };
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'reddit.com';
  }
}

// Detect tags from Reddit post
function detectTags(post: RedditPost): string[] {
  const tags: string[] = [];

  // Add subreddit as tag
  tags.push(`r/${post.subreddit}`);

  // Add flair if exists
  if (post.link_flair_text) {
    tags.push(post.link_flair_text);
  }

  return tags;
}

// Fetch posts from a subreddit
async function fetchSubredditPosts(
  subreddit: string,
  sort: 'hot' | 'top' | 'new' = 'hot',
  limit = 25
): Promise<RedditPost[]> {
  try {
    const url = `${REDDIT_API_BASE}/r/${subreddit}/${sort}.json?limit=${limit}&raw_json=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BuzzingAgent/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch r/${subreddit}: ${response.status}`);
      return [];
    }

    const data: RedditResponse = await response.json();
    return data.data.children
      .map(child => child.data)
      .filter(post => !post.stickied && !post.over_18);
  } catch (error) {
    console.error(`Error fetching r/${subreddit}:`, error);
    return [];
  }
}

// Fetch popular posts from r/popular
async function fetchPopularPosts(limit = 50): Promise<RedditPost[]> {
  try {
    const url = `${REDDIT_API_BASE}/r/popular.json?limit=${limit}&raw_json=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BuzzingAgent/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch r/popular: ${response.status}`);
    }

    const data: RedditResponse = await response.json();
    return data.data.children
      .map(child => child.data)
      .filter(post => !post.stickied && !post.over_18);
  } catch (error) {
    console.error('Error fetching r/popular:', error);
    return [];
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

// Main Reddit fetcher
export async function fetchReddit(options: {
  subreddits?: string[];
  includePopular?: boolean;
  limit?: number;
  minScore?: number;
  translate?: boolean;
} = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const {
    subreddits = DEFAULT_SUBREDDITS,
    includePopular = true,
    limit = 25,
    minScore = 100,
    translate = true,
  } = options;

  try {
    // Get or create Reddit source
    let redditSource = await db.query.sources.findFirst({
      where: eq(sources.name, 'reddit'),
    });

    if (!redditSource) {
      const [created] = await db.insert(sources).values({
        name: 'reddit',
        displayName: 'Reddit',
        description: '全球最大的社区论坛，汇聚各领域热门讨论',
        apiEndpoint: REDDIT_API_BASE,
        minScore,
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      redditSource = created;
    }

    // Fetch posts from all sources
    const allRedditPosts: RedditPost[] = [];

    // Fetch from popular
    if (includePopular) {
      const popularPosts = await fetchPopularPosts(50);
      allRedditPosts.push(...popularPosts);
    }

    // Fetch from specific subreddits
    for (const subreddit of subreddits) {
      const subredditPosts = await fetchSubredditPosts(subreddit, 'hot', limit);
      allRedditPosts.push(...subredditPosts);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Deduplicate by ID
    const uniquePosts = Array.from(
      new Map(allRedditPosts.map(p => [p.id, p])).values()
    );

    // Filter by minimum score
    const validPosts = uniquePosts.filter(post => post.score >= minScore);

    // Sort by score descending
    validPosts.sort((a, b) => b.score - a.score);

    // Process and save posts
    let newPostsCount = 0;

    for (const item of validPosts) {
      const externalId = item.id;

      // Check if post already exists
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.sourceId, redditSource.id),
          eq(posts.externalId, externalId)
        ),
      });

      if (existing) {
        // Update score if changed significantly
        if (Math.abs((existing.score || 0) - item.score) > 50) {
          await db.update(posts)
            .set({ score: item.score, updatedAt: new Date() })
            .where(eq(posts.id, existing.id));
        }
        continue;
      }

      // Prepare new post
      const sourceUrl = item.is_self
        ? `https://reddit.com${item.permalink}`
        : item.url;

      const postData: NewPost = {
        sourceId: redditSource.id,
        externalId,
        titleEn: item.title,
        sourceUrl,
        sourceDomain: item.is_self ? 'reddit.com' : extractDomain(item.url),
        author: item.author,
        authorUrl: `https://reddit.com/user/${item.author}`,
        score: item.score,
        tags: detectTags(item),
        thumbnailUrl: item.thumbnail && item.thumbnail.startsWith('http') ? item.thumbnail : null,
        publishedAt: new Date(item.created_utc * 1000),
      };

      // Translate to all locales if enabled
      if (translate) {
        try {
          const translations = await translatePostToAllLocales({ titleEn: postData.titleEn });
          postData.translations = translations;
          postData.isTranslated = true;
          postData.translatedAt = new Date();
        } catch (error) {
          console.error(`Failed to translate: ${postData.titleEn}`, error);
        }
      }

      // Insert new post
      await db.insert(posts).values(postData);
      newPostsCount++;
    }

    // Cleanup old posts to maintain maxPosts limit
    const maxPosts = redditSource.maxPosts || DEFAULT_MAX_POSTS;
    const deletedCount = await cleanupOldPosts(redditSource.id, maxPosts);

    const duration = Date.now() - startTime;

    // Log fetch result
    await db.insert(fetchLogs).values({
      sourceName: 'reddit',
      status: 'success',
      itemsCount: newPostsCount,
      duration,
    });

    return {
      count: validPosts.length,
      newPosts: newPostsCount,
      deleted: deletedCount,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await db.insert(fetchLogs).values({
      sourceName: 'reddit',
      status: 'failed',
      itemsCount: 0,
      errorMsg,
      duration,
    });

    throw error;
  }
}
