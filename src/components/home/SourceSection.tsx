'use client';

// Source Section Component - Collapsible section for each source on homepage

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { PostCard } from '@/components/post/PostCard';
import type { PostCardData } from '@/types';
import type { Locale } from '@/i18n/routing';

interface SourceSectionProps {
  sourceName: string;
  sourceTitle: string;
  sourceDescription: string;
  posts: PostCardData[];
  locale: Locale;
  moreLabel: string;
  viewAllLabel: string;
}

// Responsive: 3 rows × columns (1 col mobile, 2 col tablet, 3 col desktop)
const ROWS_INITIAL = 3;
const MULTIPLIER = 5;
const MAX_POSTS = 300;

// Breakpoints matching Tailwind: sm=640, md=768, lg=1024
function getColumns(width: number): number {
  if (width >= 1024) return 3; // lg: 3 columns
  if (width >= 640) return 2;  // sm: 2 columns
  return 1;                     // mobile: 1 column
}

export function SourceSection({
  sourceName,
  sourceTitle,
  sourceDescription,
  posts,
  locale,
  moreLabel,
  viewAllLabel,
}: SourceSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [columns, setColumns] = useState(3);
  const [expandLevel, setExpandLevel] = useState(0); // 0: initial, 1: x5, 2: max

  // Detect columns on mount and resize
  useEffect(() => {
    const updateColumns = () => setColumns(getColumns(window.innerWidth));
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Calculate visible count based on columns and expand level
  const getVisibleCount = () => {
    const initial = columns * ROWS_INITIAL; // 2 rows × columns
    if (expandLevel === 0) return initial;
    if (expandLevel === 1) return initial * MULTIPLIER;
    return MAX_POSTS;
  };

  const visibleCount = getVisibleCount();
  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = posts.length > visibleCount;
  const canExpand = expandLevel < 2 && hasMore;

  const handleExpand = () => {
    if (expandLevel < 2) {
      setExpandLevel(prev => prev + 1);
    }
  };

  return (
    <section className="border-b border-gray-200 dark:border-gray-800 pb-8 last:border-b-0">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-left group"
        >
          {/* Collapse/Expand Icon */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>

          {/* Source Title */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {sourceTitle}
          </h2>

          {/* Post Count Badge */}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({posts.length})
          </span>
        </button>

        {/* View All Link */}
        <Link
          href={`/${sourceName}`}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
        >
          {viewAllLabel}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
          {/* Posts Grid - responsive: 1 col mobile, 2 col tablet (sm), 3 col desktop (lg) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visiblePosts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                locale={locale}
                rank={index + 1}
              />
            ))}
          </div>

          {/* Show More Button */}
          {canExpand && (
            <div className="mt-4 text-center">
              <button
                onClick={handleExpand}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                {moreLabel}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
