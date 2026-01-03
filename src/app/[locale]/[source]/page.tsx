// Buzzing Agent - Source Page (e.g., /zh/hn, /en/ph)

import { db, posts, sources } from '@/db';
import { desc, eq, sql } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PostListWithLoadMore } from '@/components/post/PostListWithLoadMore';
import type { PostCardData } from '@/types';
import type { Locale } from '@/i18n/routing';

const POSTS_PER_PAGE = 30;

// Valid source names
const validSources = ['hn', 'showhn', 'askhn', 'lobsters', 'arstechnica', 'guardian', 'nature', 'skynews', 'devto', 'ph', 'watcha'] as const;
type SourceName = typeof validSources[number];

// Source titles (descriptions are in translation files)
const sourceTitles: Record<SourceName, string> = {
  hn: 'Hacker News',
  showhn: 'Show HN',
  askhn: 'Ask HN',
  lobsters: 'Lobsters',
  arstechnica: 'Ars Technica',
  guardian: 'The Guardian',
  nature: 'Nature',
  skynews: 'Sky News',
  devto: 'Dev.to',
  ph: 'Product Hunt',
  watcha: '观猹',
};

async function getSourcePosts(sourceName: string, limit = POSTS_PER_PAGE): Promise<PostCardData[]> {
  try {
    // Find source
    const source = await db.query.sources.findFirst({
      where: eq(sources.name, sourceName),
    });

    if (!source) {
      return [];
    }

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
      .where(eq(posts.sourceId, source.id))
      .orderBy(sql`date(${posts.publishedAt}, 'unixepoch') DESC`, desc(posts.score), desc(posts.publishedAt))
      .limit(limit);

    return result.map((row) => ({
      id: row.id,
      titleOriginal: row.titleOriginal || row.titleEn || '',
      originalLang: row.originalLang || 'en',
      titleEn: row.titleEn ?? undefined,
      translations: row.translations,
      sourceUrl: row.sourceUrl,
      originUrl: row.originUrl,
      sourceDomain: row.sourceDomain ?? '',
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
    console.error(`Failed to fetch posts for source ${sourceName}:`, error);
    return [];
  }
}

async function getSourcePostCount(sourceName: string): Promise<number> {
  try {
    const source = await db.query.sources.findFirst({
      where: eq(sources.name, sourceName),
    });

    if (!source) return 0;

    const result = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.sourceId, source.id));

    return result.length;
  } catch {
    return 0;
  }
}

type Props = {
  params: Promise<{ locale: string; source: string }>;
};

export default async function SourcePage({ params }: Props) {
  const { locale, source } = await params;
  setRequestLocale(locale);

  // Validate source
  if (!validSources.includes(source as SourceName)) {
    notFound();
  }

  const sourceName = source as SourceName;
  const t = await getTranslations('source');
  const title = sourceTitles[sourceName];

  const sourcePosts = await getSourcePosts(sourceName);
  const totalCount = await getSourcePostCount(sourceName);
  const hasMore = totalCount > POSTS_PER_PAGE;

  return (
    <div className="space-y-8">
      {/* Source Header */}
      <section className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t(sourceName)}
        </p>
      </section>

      {/* Post List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('hotPosts')} ({totalCount})
          </h2>
        </div>

        {sourcePosts.length === 0 ? (
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
            initialPosts={sourcePosts}
            locale={locale as Locale}
            source={sourceName}
            hasMore={hasMore}
            totalCount={totalCount}
          />
        )}
      </section>
    </div>
  );
}

// Generate static params for all locales and sources
export function generateStaticParams() {
  const locales = ['zh', 'en', 'ja'];
  const sources = ['hn']; // Only HN is active for now

  return locales.flatMap((locale) =>
    sources.map((source) => ({
      locale,
      source,
    }))
  );
}
