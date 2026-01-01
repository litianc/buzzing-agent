'use client';

// Buzzing Agent - Post List with Load More (Grid Layout)

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { PostCard } from './PostCard';
import type { PostCardData } from '@/types';
import type { Locale } from '@/i18n/routing';

interface PostListWithLoadMoreProps {
  initialPosts: PostCardData[];
  locale: Locale;
  source?: string;
  hasMore: boolean;
  totalCount: number;
}

export function PostListWithLoadMore({
  initialPosts,
  locale,
  source,
  hasMore: initialHasMore,
  totalCount,
}: PostListWithLoadMoreProps) {
  const t = useTranslations('post');
  const [posts, setPosts] = useState<PostCardData[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: '30',
      });

      if (source) {
        params.set('source', source);
      }

      const response = await fetch(`/api/posts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to load more posts');
      }

      const data = await response.json();

      setPosts((prev) => [...prev, ...data.data]);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
      console.error('Failed to load more posts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, hasMore, isLoading, source]);

  const remainingCount = totalCount - posts.length;

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post, index) => (
          <PostCard key={post.id} post={post} locale={locale} rank={index + 1} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          {error && (
            <p className="mb-2 text-sm text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('loading')}
              </>
            ) : (
              <>
                {t('loadMore')} {remainingCount > 0 && `(${remainingCount}+)`}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
