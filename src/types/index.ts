// Buzzing Agent - Type Definitions

import type { PostTranslations, Locale } from '@/db/schema';

export interface PostCardData {
  id: string;
  titleOriginal: string;
  originalLang: Locale;
  translations: PostTranslations | null;
  sourceUrl: string;
  originUrl: string | null;
  sourceDomain: string;
  thumbnailUrl: string | null;
  author: string | null;
  authorUrl: string | null;
  score: number;
  tags: string[];
  publishedAt: Date;
  source: {
    name: string;
    displayName: string;
  };
  // 兼容旧字段
  titleEn?: string;
}

export interface SourceData {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  minScore: number;
  maxPosts: number;
  isActive: boolean;
}

export interface FeedConfig {
  source: string;
  title: string;
  subtitle: string;
  link: string;
  feedUrl: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface FetchResult {
  count: number;
  newPosts: number;
  duration: number;
}

export interface TranslationResult {
  text: string;
  alternatives?: string[];
  fromCache?: boolean;
}
