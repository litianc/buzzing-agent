// Buzzing Agent - Product Hunt Data Fetcher
// Scrapes Product Hunt's public pages (no API key required)
//
// 采集策略 (对标观猹):
// - 采集: 首页热门产品 (order: RANKING)，过滤已存在的
// - 过滤: 只采集 votes >= 10 的产品
// - 采集日期: 使用我们第一次发现产品的时间 (不是 PH 的 createdAt)
// - 排序: 采集日期优先 (publishedAt DESC)，同天按热度 (score DESC)
// - 清理: 保留最新 300 条，超出删除旧的

import { db, posts, sources, fetchLogs, type NewPost } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { translatePostToAllLocales } from './translate';
import * as cheerio from 'cheerio';

const PH_BASE_URL = 'https://www.producthunt.com';
const DEFAULT_MAX_POSTS = 300;

interface PHProduct {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  url: string;
  websiteUrl?: string;
  thumbnailUrl?: string;
  votesCount: number;
  commentsCount: number;
  createdAt: Date;
  topics: string[];
  makers: string[];
}

// Parse Product Hunt homepage
async function fetchPHHomepage(): Promise<PHProduct[]> {
  try {
    const response = await fetch(PH_BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PH homepage: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: PHProduct[] = [];

    // Parse the script data that contains the product information
    const scripts = $('script').toArray();

    for (const script of scripts) {
      const content = $(script).html() || '';

      // Look for the JSON data in the page
      if (content.includes('__NEXT_DATA__')) {
        try {
          const jsonMatch = content.match(/__NEXT_DATA__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            // Extract products from the data structure
            const posts = extractProductsFromNextData(data);
            products.push(...posts);
          }
        } catch {
          // Continue if parsing fails
        }
      }
    }

    // Fallback: parse HTML directly
    if (products.length === 0) {
      $('[data-test="post-item"]').each((_, element) => {
        const $el = $(element);
        const name = $el.find('[data-test="post-name"]').text().trim();
        const tagline = $el.find('[data-test="post-tagline"]').text().trim();
        const href = $el.find('a').first().attr('href');
        const votesText = $el.find('[data-test="vote-button"]').text().trim();
        const votes = parseInt(votesText.replace(/\D/g, '')) || 0;

        if (name && href) {
          const slug = href.replace('/posts/', '');
          products.push({
            id: slug,
            name,
            slug,
            tagline,
            url: `${PH_BASE_URL}${href}`,
            votesCount: votes,
            commentsCount: 0,
            createdAt: new Date(),
            topics: [],
            makers: [],
          });
        }
      });
    }

    return products;
  } catch (error) {
    console.error('Error fetching PH homepage:', error);
    return [];
  }
}

// Extract products from Next.js data
function extractProductsFromNextData(data: unknown): PHProduct[] {
  const products: PHProduct[] = [];

  try {
    // Navigate through the data structure to find products
    const traverse = (obj: unknown, depth = 0): void => {
      if (depth > 10 || !obj || typeof obj !== 'object') return;

      const record = obj as Record<string, unknown>;

      // Check if this object looks like a product
      if (
        record.name &&
        record.tagline &&
        (record.votesCount !== undefined || record.votes_count !== undefined)
      ) {
        const slugValue = String(record.slug || record.id || Math.random());
        const product: PHProduct = {
          id: String(record.id || slugValue),
          name: String(record.name),
          slug: slugValue,
          tagline: String(record.tagline),
          url: record.url ? String(record.url) : `${PH_BASE_URL}/posts/${slugValue}`,
          websiteUrl: record.website ? String(record.website) : undefined,
          thumbnailUrl: (record.thumbnail as Record<string, unknown>)?.url ? String((record.thumbnail as Record<string, unknown>).url) : undefined,
          votesCount: Number(record.votesCount || record.votes_count || 0),
          commentsCount: Number(record.commentsCount || record.comments_count || 0),
          createdAt: record.createdAt ? new Date(String(record.createdAt)) : new Date(),
          topics: Array.isArray(record.topics) ? record.topics.map((t: unknown) => {
            if (typeof t === 'string') return t;
            if (t && typeof t === 'object' && 'name' in t) return String((t as {name: unknown}).name);
            return '';
          }).filter(Boolean) : [],
          makers: [],
        };
        products.push(product);
      }

      // Continue traversing
      for (const value of Object.values(record)) {
        if (Array.isArray(value)) {
          value.forEach(item => traverse(item, depth + 1));
        } else if (value && typeof value === 'object') {
          traverse(value, depth + 1);
        }
      }
    };

    traverse(data);
  } catch {
    // Ignore parsing errors
  }

  return products;
}

// Fetch via API if available (requires API key)
async function fetchPHApi(): Promise<PHProduct[]> {
  const apiKey = process.env.PRODUCTHUNT_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `
          query {
            posts(first: 50, order: RANKING) {
              edges {
                node {
                  id
                  name
                  slug
                  tagline
                  url
                  website
                  votesCount
                  commentsCount
                  createdAt
                  thumbnail {
                    url
                  }
                  media {
                    url
                    type
                  }
                  topics {
                    edges {
                      node {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const edges = data?.data?.posts?.edges || [];

    return edges.map((edge: { node: Record<string, unknown> }) => {
      const node = edge.node;
      // 优先使用 media 中的第一张图片，回退到 thumbnail
      const mediaItems = node.media as Array<{url: string; type: string}> || [];
      const firstImage = mediaItems.find(m => m.type === 'image');
      const thumbnailUrl = firstImage?.url
        || (node.thumbnail as Record<string, unknown>)?.url as string
        || undefined;
      return {
        id: String(node.id),
        name: String(node.name),
        slug: String(node.slug || node.id),
        tagline: String(node.tagline),
        url: String(node.url),
        websiteUrl: node.website ? String(node.website) : undefined,
        thumbnailUrl,
        votesCount: Number(node.votesCount || 0),
        commentsCount: Number(node.commentsCount || 0),
        createdAt: new Date(String(node.createdAt)),
        topics: ((node.topics as Record<string, unknown>)?.edges as Array<{node: {name: string}}> || [])
          .map(e => e.node.name),
        makers: [],
      } as PHProduct;
    });
  } catch (error) {
    console.error('Error fetching PH API:', error);
    return [];
  }
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'producthunt.com';
  }
}

// 清理策略: 保留最新的 maxPosts 条，超过就删除旧的
// 按上榜时间 (publishedAt) 排序，同天按热度排序，保留最新的
async function cleanupOldPosts(sourceId: string, maxPosts: number): Promise<number> {
  const allPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.sourceId, sourceId))
    .orderBy(desc(posts.publishedAt), desc(posts.score));

  if (allPosts.length <= maxPosts) {
    return 0;
  }

  const postsToDelete = allPosts.slice(maxPosts).map(p => p.id);

  if (postsToDelete.length > 0) {
    await db.delete(posts).where(inArray(posts.id, postsToDelete));
    console.log(`[PH] Cleaned up ${postsToDelete.length} old posts (kept ${maxPosts})`);
  }

  return postsToDelete.length;
}

// Main Product Hunt fetcher
export async function fetchProductHunt(options: {
  minVotes?: number;
  translate?: boolean;
} = {}): Promise<{ count: number; newPosts: number; deleted: number; duration: number }> {
  const startTime = Date.now();
  const { minVotes = 10, translate = true } = options;

  try {
    // Get or create PH source
    let phSource = await db.query.sources.findFirst({
      where: eq(sources.name, 'ph'),
    });

    if (!phSource) {
      const [created] = await db.insert(sources).values({
        name: 'ph',
        displayName: 'Product Hunt',
        description: '发现最新最热门的科技产品和创业项目',
        apiEndpoint: PH_BASE_URL,
        minScore: minVotes,
        maxPosts: DEFAULT_MAX_POSTS,
        isActive: true,
      }).returning();
      phSource = created;
    }

    // Try API first, fallback to scraping
    let products = await fetchPHApi();

    if (products.length === 0) {
      products = await fetchPHHomepage();
    }

    // Filter by minimum votes
    const validProducts = products.filter(p => p.votesCount >= minVotes);

    // Sort by votes descending
    validProducts.sort((a, b) => b.votesCount - a.votesCount);

    // Process and save posts
    let newPostsCount = 0;

    for (const item of validProducts) {
      const externalId = item.id;

      // Check if post already exists
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.sourceId, phSource.id),
          eq(posts.externalId, externalId)
        ),
      });

      if (existing) {
        // Update votes only if increased by more than 30
        if (item.votesCount - (existing.score || 0) > 30) {
          await db.update(posts)
            .set({ score: item.votesCount, updatedAt: new Date() })
            .where(eq(posts.id, existing.id));
        }
        continue;
      }

      // Prepare title: Name - Tagline
      const title = item.tagline ? `${item.name} - ${item.tagline}` : item.name;

      // PH 产品页面链接 (干净的 URL，使用 slug)
      const phPageUrl = `${PH_BASE_URL}/posts/${item.slug}`;
      // sourceUrl = 产品官网跳转链接，无则用 PH 页面
      const sourceUrl = item.websiteUrl || phPageUrl;
      // sourceDomain: 跳转链接无法提取真实域名，统一显示 producthunt.com
      const sourceDomain = item.websiteUrl ? 'producthunt.com' : 'producthunt.com';

      // 采集日期 = 我们第一次发现这个产品的时间
      // 只保留日期部分，不保留具体时间，这样同一批采集的产品可以按热度排序
      const fetchedAt = new Date();
      fetchedAt.setHours(0, 0, 0, 0);

      const postData: NewPost = {
        sourceId: phSource.id,
        externalId,
        titleOriginal: title,
        originalLang: 'en', // PH content is in English
        titleEn: title, // 兼容旧字段
        sourceUrl,
        originUrl: phPageUrl, // PH 产品页面 (干净链接)
        sourceDomain,
        score: item.votesCount,
        tags: item.topics.length > 0 ? item.topics.slice(0, 3) : ['Product'],
        thumbnailUrl: item.thumbnailUrl || null,
        publishedAt: fetchedAt,
      };

      // Translate to all locales if enabled
      // PH content is in English, so we translate FROM English to ZH and JA
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

    // Cleanup old posts
    const maxPosts = phSource.maxPosts || DEFAULT_MAX_POSTS;
    const deletedCount = await cleanupOldPosts(phSource.id, maxPosts);

    const duration = Date.now() - startTime;

    // Log fetch result
    await db.insert(fetchLogs).values({
      sourceName: 'ph',
      status: 'success',
      itemsCount: newPostsCount,
      duration,
    });

    return {
      count: validProducts.length,
      newPosts: newPostsCount,
      deleted: deletedCount,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await db.insert(fetchLogs).values({
      sourceName: 'ph',
      status: 'failed',
      itemsCount: 0,
      errorMsg,
      duration,
    });

    throw error;
  }
}
