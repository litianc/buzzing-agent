// Buzzing Agent - Post List Component (Grid Layout)

import { PostCard } from './PostCard';
import type { PostCardData } from '@/types';
import type { Locale } from '@/i18n/routing';

interface PostListProps {
  posts: PostCardData[];
  locale: Locale;
  showRank?: boolean; // 是否显示序号
  startRank?: number; // 起始序号 (用于分页)
}

export function PostList({ posts, locale, showRank = true, startRank = 1 }: PostListProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post, index) => (
        <PostCard
          key={post.id}
          post={post}
          locale={locale}
          rank={showRank ? startRank + index : undefined}
        />
      ))}
    </div>
  );
}
