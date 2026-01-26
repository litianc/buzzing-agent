// Buzzing Agent - Home Page (Server Component)

import { db, posts, sources } from '@/db';
import { desc, eq, sql } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SourceSection } from '@/components';
import type { PostCardData } from '@/types';
import type { Locale } from '@/i18n/routing';

// Source order and titles (descriptions are in translation files)
const sourceOrder = ['hn', 'lobsters', 'arstechnica', 'guardian', 'nature', 'skynews', 'devto', 'ph', 'watcha', 'showhn', 'askhn', 'baoyu'] as const;

// News sources don't have scores, sort by crawl time
const newsSources = ['guardian', 'nature', 'skynews', 'arstechnica'] as const;

// Blog sources don't have scores, sort by publish time
const blogSources = ['baoyu'] as const;

const sourceTitles: Record<string, string> = {
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
  baoyu: '宝玉的分享',
};

// Fetch posts for a single source (up to 300 for client-side pagination)
async function getSourcePosts(sourceName: string): Promise<PostCardData[]> {
  try {
    const source = await db.query.sources.findFirst({
      where: eq(sources.name, sourceName),
    });

    if (!source) return [];

    const isNewsSource = (newsSources as readonly string[]).includes(sourceName);
    const isBlogSource = (blogSources as readonly string[]).includes(sourceName);

    const query = db
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
      .where(eq(posts.sourceId, source.id));

    // Blog sources: sort by publish time (newest articles first)
    // News sources: sort by crawl time (no scores)
    // Community sources: group by crawl date, then sort by score
    let result;
    if (isBlogSource) {
      result = await query.orderBy(desc(posts.publishedAt)).limit(300);
    } else if (isNewsSource) {
      result = await query.orderBy(desc(posts.createdAt)).limit(300);
    } else {
      result = await query.orderBy(sql`date(${posts.publishedAt}/1000, 'unixepoch') DESC`, desc(posts.score), desc(posts.createdAt)).limit(300);
    }

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
    console.error(`Failed to fetch posts for ${sourceName}:`, error);
    return [];
  }
}

// Fetch all sources with their posts
async function getAllSourcesWithPosts(): Promise<{ name: string; title: string; posts: PostCardData[] }[]> {
  const results = await Promise.all(
    sourceOrder.map(async (name) => ({
      name,
      title: sourceTitles[name] || name,
      posts: await getSourcePosts(name),
    }))
  );

  // Only return sources that have posts
  return results.filter((source) => source.posts.length > 0);
}

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const tSource = await getTranslations('source');
  const sourcesWithPosts = await getAllSourcesWithPosts();

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

      {/* Source Sections */}
      {sourcesWithPosts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {t('noContent')}
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            {t('fetchingData')}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sourcesWithPosts.map((source) => (
            <SourceSection
              key={source.name}
              sourceName={source.name}
              sourceTitle={source.title}
              sourceDescription={tSource(source.name)}
              posts={source.posts}
              locale={locale as Locale}
              moreLabel={t('showMore')}
              viewAllLabel={t('viewAll')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
