// Buzzing Agent - Watcha (观猹) Data Fetcher
// Fetches hot AI products from watcha.cn
//
// 采集策略 (参考 PRD 11.2):
// - 采集: 热度榜前 30 名，过滤已存在的
// - 采集日期: 使用我们第一次发现产品的时间 (不是观猹的 create_at)
// - 排序: 采集日期优先 (publishedAt DESC)，同天按热度 (score DESC)
// - 清理: 保留最新 300 条，超出删除旧的

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';

const WATCHA_API_BASE = 'https://watcha.cn/api/v2';
const WATCHA_BASE_URL = 'https://watcha.cn';
const DEFAULT_MAX_POSTS = 300;

interface WatchaCategory {
  id: number;
  name: string;
}

interface WatchaStats {
  views: number;
  upvotes: number;
  downvotes: number;
  stars: number;
  review_count: number;
  reply_count: number;
  score: number;
  recent_score: number;
  hot_score: number;
  score_revealed?: boolean;
  post_count?: number;
  update_at: string;
}

interface WatchaProduct {
  id: number;
  name: string;
  slug: string;
  slogan: string;
  organization: string;
  avatar_url: string;
  image_url: string;
  status: string;
  categories: WatchaCategory[];
  stats: WatchaStats;
  create_at: string;
  update_at: string;
  website_url?: string; // 产品官网链接 (需从详情API获取)
}

interface WatchaResponse {
  statusCode: number;
  data: {
    total: number;
    skip: number;
    limit: number;
    count: number;
    items: WatchaProduct[];
  };
}

// Fetch product detail to get website_url
async function fetchProductDetail(slug: string): Promise<{ website_url?: string } | null> {
  try {
    const url = `${WATCHA_API_BASE}/products/${slug}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BuzzingAgent/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { website_url: data.data?.website_url || null };
  } catch {
    return null;
  }
}

// Fetch hot products from Watcha API
async function fetchHotProducts(limit = 50): Promise<WatchaProduct[]> {
  try {
    const url = `${WATCHA_API_BASE}/hot/products?skip=0&limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BuzzingAgent/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Watcha hot products: ${response.status}`);
    }

    const data: WatchaResponse = await response.json();
    return data.data.items.filter(item => item.status === 'PUBLISHED');
  } catch (error) {
    console.error('Error fetching Watcha hot products:', error);
    return [];
  }
}

// Fetch new products from Watcha API
async function fetchNewProducts(limit = 30): Promise<WatchaProduct[]> {
  try {
    const url = `${WATCHA_API_BASE}/products?skip=0&limit=${limit}&order_by=publish_at`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BuzzingAgent/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Watcha new products: ${response.status}`);
    }

    const data: WatchaResponse = await response.json();
    return data.data.items.filter(item => item.status === 'PUBLISHED');
  } catch (error) {
    console.error('Error fetching Watcha new products:', error);
    return [];
  }
}

// 清理策略: 保留最新的 maxPosts 条，超过就删除旧的
// 按上榜时间 (publishedAt) 排序，保留最新的
async function cleanupOldPosts(sourceId: string, maxPosts: number): Promise<number> {
  // 获取所有帖子 (按上榜时间 DESC, 热度 DESC 排序)
  const allPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.sourceId, sourceId))
    .orderBy(desc(posts.publishedAt), desc(posts.score));

  if (allPosts.length <= maxPosts) {
    return 0;
  }

  // 删除超出部分 (保留前 maxPosts 条)
  const postsToDelete = allPosts.slice(maxPosts).map(p => p.id);

  if (postsToDelete.length > 0) {
    await db.delete(posts).where(inArray(posts.id, postsToDelete));
    console.log(`[Watcha] Cleaned up ${postsToDelete.length} old posts (kept ${maxPosts})`);
  }

  return postsToDelete.length;
}

// Main Watcha fetcher
export async function fetchWatcha(options: {
  includeNew?: boolean;
  limit?: number;
  translate?: boolean;
} = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const {
    includeNew = true,
    limit = 30,  // 热度榜前 30 名
    translate = true,
  } = options;

  try {
    // Get or create Watcha source
    let watchaSource = await db.query.sources.findFirst({
      where: eq(sources.name, 'watcha'),
    });

    if (!watchaSource) {
      const [created] = await db.insert(sources).values({
        name: 'watcha',
        displayName: '观猹',
        description: 'AI 产品评测社区，发现最新最热门的 AI 应用',
        apiEndpoint: WATCHA_API_BASE,
        minScore: 0, // 无门槛，热门榜本身已过滤
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      watchaSource = created;
    }

    // Fetch products from all sources
    const allProducts: WatchaProduct[] = [];

    // Fetch hot products
    const hotProducts = await fetchHotProducts(limit);
    allProducts.push(...hotProducts);

    // Fetch new products (只采集热度 > 10 的新品)
    if (includeNew) {
      const newProducts = await fetchNewProducts(30);
      const filteredNewProducts = newProducts.filter(p => (p.stats?.hot_score || 0) >= 10);
      allProducts.push(...filteredNewProducts);
    }

    // Deduplicate by ID
    const uniqueProducts = Array.from(
      new Map(allProducts.map(p => [p.id, p])).values()
    );

    // 排序: 按上榜时间 DESC (create_at)，同天按热度 DESC
    // 注意: 不按纯分数排序，让新产品有曝光机会
    uniqueProducts.sort((a, b) => {
      // 先按上榜时间排序 (最新的在前)
      const timeA = new Date(a.create_at).getTime();
      const timeB = new Date(b.create_at).getTime();
      if (timeA !== timeB) {
        return timeB - timeA; // DESC
      }
      // 同天按热度排序
      const scoreA = Number.isFinite(a.stats?.hot_score) ? a.stats.hot_score : 0;
      const scoreB = Number.isFinite(b.stats?.hot_score) ? b.stats.hot_score : 0;
      return scoreB - scoreA; // DESC
    });

    // Process and save posts
    let newPostsCount = 0;

    for (const item of uniqueProducts) {
      const externalId = String(item.id);

      // Check if post already exists
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.sourceId, watchaSource.id),
          eq(posts.externalId, externalId)
        ),
      });

      if (existing) {
        // Update score only if increased by more than 20
        const currentScore = Number.isFinite(item.stats?.hot_score) ? Math.round(item.stats.hot_score) : 0;
        const previousScore = existing.score || 0;
        if (currentScore - previousScore > 20) {
          await db.update(posts)
            .set({ score: currentScore, updatedAt: new Date() })
            .where(eq(posts.id, existing.id));
        }
        continue;
      }

      // Prepare title: Name - Slogan
      const title = item.slogan ? `${item.name} - ${item.slogan}` : item.name;

      // 获取产品详情以获取官网链接
      const detail = await fetchProductDetail(item.slug);
      const websiteUrl = detail?.website_url;
      // 观猹产品页面链接
      const watchaPageUrl = `${WATCHA_BASE_URL}/products/${item.slug}`;
      // 优先使用产品官网，无官网则用观猹页面
      const sourceUrl = websiteUrl || watchaPageUrl;
      const sourceDomain = websiteUrl ? new URL(websiteUrl).hostname : 'watcha.cn';

      // Extract tags from categories
      const tags = item.categories.map(c => c.name).slice(0, 3);
      if (item.organization) {
        tags.unshift(item.organization);
      }

      const hotScore = Number.isFinite(item.stats?.hot_score) ? Math.round(item.stats.hot_score) : 0;

      // 采集日期 = 我们第一次发现这个产品的时间，而不是产品在观猹的上架时间
      // 只保留日期部分，不保留具体时间，这样同一批采集的产品可以按热度排序
      const fetchedAt = new Date();
      fetchedAt.setHours(0, 0, 0, 0);

      const postData: NewPost = {
        sourceId: watchaSource.id,
        externalId,
        titleOriginal: title,
        originalLang: 'zh', // Watcha content is in Chinese
        titleEn: title, // 兼容旧字段
        sourceUrl,
        originUrl: watchaPageUrl, // 观猹产品页面
        sourceDomain,
        author: item.organization || null,
        score: hotScore,
        tags: tags.slice(0, 4),
        thumbnailUrl: item.image_url || item.avatar_url || null,
        publishedAt: fetchedAt,
      };

      // Translate to all locales if enabled
      // Watcha content is in Chinese, so we translate FROM Chinese to EN and JA
      if (translate) {
        try {
          const translations = await translatePostToAllLocales({
            titleOriginal: postData.titleOriginal!,
            originalLang: 'zh',
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
    const maxPosts = watchaSource.maxPosts || DEFAULT_MAX_POSTS;
    const deletedCount = await cleanupOldPosts(watchaSource.id, maxPosts);

    const duration = Date.now() - startTime;

    // Log fetch result
    await db.insert(fetchLogs).values({
      sourceName: 'watcha',
      status: 'success',
      itemsCount: newPostsCount,
      duration,
    });

    return {
      count: uniqueProducts.length,
      newPosts: newPostsCount,
      deleted: deletedCount,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await db.insert(fetchLogs).values({
      sourceName: 'watcha',
      status: 'failed',
      itemsCount: 0,
      errorMsg,
      duration,
    });

    throw error;
  }
}
