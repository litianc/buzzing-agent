'use client';

// Buzzing Agent - Post Card Component (Minimal Grid Style)

import { formatScore, getFaviconUrl, formatDate } from '@/lib/utils';
import { useImageMode } from '@/contexts/ImageModeContext';
import type { PostCardData } from '@/types';
import type { Locale } from '@/i18n/routing';
import type { Locale as DbLocale } from '@/db/schema';

interface PostCardProps {
  post: PostCardData;
  locale: Locale;
  rank?: number; // 序号 (1-based)
}

// Get localized title based on current locale
// Priority: translations[locale] > titleOriginal (if originalLang matches) > titleOriginal (fallback)
function getLocalizedTitle(post: PostCardData, locale: Locale): string {
  // 1. 如果有该语言的翻译，使用翻译
  const translation = post.translations?.[locale as DbLocale];
  if (translation?.title) {
    return translation.title;
  }

  // 2. 如果原始语言就是当前语言，使用原始标题
  if (post.originalLang === locale) {
    return post.titleOriginal;
  }

  // 3. 回退到原始标题
  return post.titleOriginal || post.titleEn || '';
}

export function PostCard({ post, locale, rank }: PostCardProps) {
  const title = getLocalizedTitle(post, locale);
  const { isWithImages } = useImageMode();
  const showThumbnail = isWithImages && post.thumbnailUrl;

  return (
    <article className="group flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all overflow-hidden">
      {/* Thumbnail - only render when image mode is on */}
      {showThumbnail && (
        <a
          href={post.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800"
        >
          <img
            src={post.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Rank badge on thumbnail */}
          {rank !== undefined && (
            <span className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center bg-black/60 text-white text-xs font-bold rounded">
              {rank}
            </span>
          )}
        </a>
      )}

      {/* Content */}
      <div className="flex-1 p-3">
        {/* Title with rank (when no thumbnail) */}
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 min-h-[2.5rem]">
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {rank !== undefined && !showThumbnail && (
              <span className="inline-flex items-center justify-center w-5 h-5 mr-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded">
                {rank}
              </span>
            )}
            {title}
          </a>
        </h3>

        {/* Meta */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          {/* Source & Date */}
          <span className="inline-flex items-center gap-1 truncate">
            <img
              src={getFaviconUrl(post.sourceDomain)}
              alt=""
              className="w-3 h-3 flex-shrink-0"
              loading="lazy"
            />
            <span className="truncate">{post.sourceDomain}</span>
            <span className="text-gray-400 dark:text-gray-500">·</span>
            <span className="flex-shrink-0">{formatDate(post.publishedAt, locale)}</span>
          </span>

          {/* Score - only show when score > 0 (RSS sources have no scores) */}
          {post.score > 0 && (
            post.originUrl ? (
              <a
                href={post.originUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-orange-600 dark:text-orange-400 font-medium flex-shrink-0 hover:text-orange-700 dark:hover:text-orange-300"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                </svg>
                {formatScore(post.score)}
              </a>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-orange-600 dark:text-orange-400 font-medium flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                </svg>
                {formatScore(post.score)}
              </span>
            )
          )}
        </div>
      </div>
    </article>
  );
}
