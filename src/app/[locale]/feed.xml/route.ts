import { Feed } from 'feed';
import { db, posts, sources } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { type Locale } from '@/i18n/routing';

const SITE_URL = 'https://buzzing.litianc.cn';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  const titles: Record<Locale, string> = {
    zh: 'Buzzing Agent - 用中文浏览全球热门内容',
    en: 'Buzzing Agent - Browse Global Trending Content',
    ja: 'Buzzing Agent - 世界のトレンドを日本語で',
  };

  const descriptions: Record<Locale, string> = {
    zh: '用中文浏览国外社交媒体里的热门讨论',
    en: 'Browse trending discussions from global social media',
    ja: '世界のソーシャルメディアのトレンドを日本語で',
  };

  const feed = new Feed({
    title: titles[locale as Locale] || titles.zh,
    description: descriptions[locale as Locale] || descriptions.zh,
    id: SITE_URL,
    link: `${SITE_URL}/${locale}`,
    language: locale,
    favicon: `${SITE_URL}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, Buzzing Agent`,
    feedLinks: {
      rss: `${SITE_URL}/${locale}/feed.xml`,
    },
  });

  // Fetch recent posts
  const recentPosts = await db
    .select({
      id: posts.id,
      titleOriginal: posts.titleOriginal,
      titleEn: posts.titleEn,
      translations: posts.translations,
      originalLang: posts.originalLang,
      sourceUrl: posts.sourceUrl,
      originUrl: posts.originUrl,
      sourceDomain: posts.sourceDomain,
      author: posts.author,
      score: posts.score,
      publishedAt: posts.publishedAt,
      source: {
        name: sources.name,
        displayName: sources.displayName,
      },
    })
    .from(posts)
    .leftJoin(sources, eq(posts.sourceId, sources.id))
    .orderBy(desc(posts.publishedAt))
    .limit(100);

  for (const post of recentPosts) {
    // Get localized title
    let title = post.titleOriginal || post.titleEn || '';
    const translations = post.translations as Record<string, { title?: string; summary?: string }> | null;
    if (translations?.[locale]?.title) {
      title = translations[locale].title;
    }

    feed.addItem({
      title,
      id: post.id,
      link: post.sourceUrl,
      description: `[${post.source?.displayName || post.sourceDomain}] ${(post.score || 0) > 0 ? `Score: ${post.score}` : ''}`,
      author: post.author ? [{ name: post.author }] : undefined,
      date: new Date(post.publishedAt),
    });
  }

  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
