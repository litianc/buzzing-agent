// Tests for PostCard component
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostCard } from '@/components/post/PostCard';
import type { PostCardData } from '@/types';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'zh',
}));

const mockPost: PostCardData = {
  id: '1',
  titleEn: 'Test Post Title',
  translations: {
    zh: { title: '测试文章标题' },
    ja: { title: 'テスト記事タイトル' },
  },
  sourceUrl: 'https://example.com/post',
  sourceDomain: 'example.com',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  author: 'testuser',
  authorUrl: 'https://example.com/user/testuser',
  score: 100,
  tags: ['tech', 'news'],
  publishedAt: new Date('2024-01-15T12:00:00Z'),
  source: {
    name: 'hn',
    displayName: 'Hacker News',
  },
};

describe('PostCard', () => {
  it('should render English title when locale is en', () => {
    render(<PostCard post={mockPost} locale="en" />);
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });

  it('should render Chinese title when locale is zh', () => {
    render(<PostCard post={mockPost} locale="zh" />);
    expect(screen.getByText('测试文章标题')).toBeInTheDocument();
  });

  it('should render Japanese title when locale is ja', () => {
    render(<PostCard post={mockPost} locale="ja" />);
    expect(screen.getByText('テスト記事タイトル')).toBeInTheDocument();
  });

  it('should fallback to English title when translation is missing', () => {
    const postWithoutTranslation: PostCardData = {
      ...mockPost,
      translations: {},
    };
    render(<PostCard post={postWithoutTranslation} locale="zh" />);
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });

  it('should show English subtitle when viewing in non-English locale', () => {
    render(<PostCard post={mockPost} locale="zh" />);
    // Both Chinese title and English subtitle should be visible
    expect(screen.getByText('测试文章标题')).toBeInTheDocument();
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });

  it('should not show subtitle when viewing in English', () => {
    render(<PostCard post={mockPost} locale="en" />);
    // Only one instance of title should exist
    const titles = screen.getAllByText('Test Post Title');
    expect(titles).toHaveLength(1);
  });

  it('should render author name', () => {
    render(<PostCard post={mockPost} locale="en" />);
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should render formatted score', () => {
    render(<PostCard post={mockPost} locale="en" />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should render source domain', () => {
    render(<PostCard post={mockPost} locale="en" />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('should render tags', () => {
    render(<PostCard post={mockPost} locale="en" />);
    expect(screen.getByText('tech')).toBeInTheDocument();
    expect(screen.getByText('news')).toBeInTheDocument();
  });

  it('should render rank when provided', () => {
    render(<PostCard post={mockPost} locale="en" rank={1} />);
    expect(screen.getByText('1.')).toBeInTheDocument();
  });

  it('should not render rank when not provided', () => {
    render(<PostCard post={mockPost} locale="en" />);
    expect(screen.queryByText('1.')).not.toBeInTheDocument();
  });

  it('should render thumbnail when showThumbnail is true', () => {
    render(<PostCard post={mockPost} locale="en" showThumbnail={true} />);
    // Images with alt="" are presentation role, query by tag
    const container = document.querySelector('.flex-shrink-0.w-24');
    const img = container?.querySelector('img');
    expect(img).toHaveAttribute('src', mockPost.thumbnailUrl);
  });
});
