// Buzzing Agent - Home Page (Server Component)

import { db, posts, sources } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PostListWithLoadMore } from '@/components';
import type { PostCardData } from '@/types';
import type { Locale } from '@/i18n/routing';

const POSTS_PER_PAGE = 30;

async function getLatestPosts(limit = POSTS_PER_PAGE): Promise<PostCardData[]> {
  try {
    const result = await db
      .select({
        id: posts.id,
        titleOriginal: posts.titleOriginal,
        originalLang: posts.originalLang,
        titleEn: posts.titleEn,
        translations: posts.translations,
        sourceUrl: posts.sourceUrl,
        originUrl: posts.originUrl,
        sourceDomain: posts.sourceDomain,
        thumbnailUrl: posts.thumbnailUrl,
        author: posts.author,
        authorUrl: posts.authorUrl,
        score: posts.score,
        tags: posts.tags,
        publishedAt: posts.publishedAt,
        sourceName: sources.name,
        sourceDisplayName: sources.displayName,
      })
      .from(posts)
      .leftJoin(sources, eq(posts.sourceId, sources.id))
      .orderBy(desc(posts.score))
      .limit(limit);

    return result.map((row) => ({
      id: row.id,
      titleOriginal: row.titleOriginal || row.titleEn || '',
      originalLang: row.originalLang || 'en',
      titleEn: row.titleEn,
      translations: row.translations,
      sourceUrl: row.sourceUrl,
      originUrl: row.originUrl,
      sourceDomain: row.sourceDomain,
      thumbnailUrl: row.thumbnailUrl,
      author: row.author,
      authorUrl: row.authorUrl,
      score: row.score ?? 0,
      tags: row.tags ?? [],
      publishedAt: row.publishedAt!,
      source: {
        name: row.sourceName ?? 'unknown',
        displayName: row.sourceDisplayName ?? 'Unknown',
      },
    }));
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return [];
  }
}

async function getTotalPostCount(): Promise<number> {
  try {
    const result = await db.select({ id: posts.id }).from(posts);
    return result.length;
  } catch {
    return 0;
  }
}

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const latestPosts = await getLatestPosts();
  const totalCount = await getTotalPostCount();
  const hasMore = totalCount > POSTS_PER_PAGE;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('heroTitle')}
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t('heroDescription')}
        </p>
      </section>

      {/* Post List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('hotContent')}
          </h2>
          <a
            href={`/${locale}/feed.xml`}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400"
          >
            {t('subscribeRss')}
          </a>
        </div>

        {latestPosts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {t('noContent')}
            </p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              {t('fetchingData')}
            </p>
          </div>
        ) : (
          <PostListWithLoadMore
            initialPosts={latestPosts}
            locale={locale as Locale}
            hasMore={hasMore}
            totalCount={totalCount}
          />
        )}
      </section>
    </div>
  );
}
