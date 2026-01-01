// Buzzing Agent - Drizzle Schema
// Database: Turso (libSQL/SQLite)

import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// 支持的语言
export type Locale = 'en' | 'zh' | 'ja';
export const allLocales: Locale[] = ['en', 'zh', 'ja'];

// 多语言翻译类型
export interface PostTranslation {
  title: string;
  summary?: string;
}

export interface PostTranslations {
  en?: PostTranslation;
  zh?: PostTranslation;
  ja?: PostTranslation;
}

// 数据源配置
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),        // "hn", "reddit", "ph"
  displayName: text('display_name').notNull(),  // "Hacker News"
  description: text('description'),
  apiEndpoint: text('api_endpoint'),
  minScore: integer('min_score').default(100),
  maxPosts: integer('max_posts').default(300),  // 每个源最多保留的帖子数
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 文章/帖子
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),

  // 原文信息
  externalId: text('external_id').notNull(),    // 原平台 ID
  titleOriginal: text('title_original'),           // 原始标题 (可能是任何语言)
  summaryOriginal: text('summary_original'),       // 原始摘要
  originalLang: text('original_lang').$type<Locale>().default('en'), // 原始语言 ('en', 'zh', 'ja')

  // 兼容旧字段 (保留以便迁移)
  titleEn: text('title_en'),                    // 已废弃，使用 titleOriginal
  summaryEn: text('summary_en'),                // 已废弃，使用 summaryOriginal
  sourceUrl: text('source_url').notNull(),      // 内容链接 (产品官网、文章原文)
  originUrl: text('origin_url'),                 // 来源平台页面 (观猹页、HN讨论页)
  sourceDomain: text('source_domain').notNull(), // 来源域名
  thumbnailUrl: text('thumbnail_url'),          // 缩略图
  author: text('author'),                       // 作者
  authorUrl: text('author_url'),                // 作者主页
  score: integer('score').default(0),           // 热度分数

  // 多语言翻译 (JSON)
  translations: text('translations', { mode: 'json' }).$type<PostTranslations>().default({}),
  isTranslated: integer('is_translated', { mode: 'boolean' }).default(false),
  translatedAt: integer('translated_at', { mode: 'timestamp' }),

  // 元数据
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('posts_source_external_idx').on(table.sourceId, table.externalId),
  index('posts_source_published_idx').on(table.sourceId, table.publishedAt),
  index('posts_score_idx').on(table.score),
  index('posts_translated_idx').on(table.isTranslated),
]);

// 翻译缓存 (支持多语言)
export const translationCache = sqliteTable('translation_cache', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  textHash: text('text_hash').notNull(),        // MD5(原文)
  targetLang: text('target_lang').notNull(),    // 'zh', 'ja'
  originalText: text('original_text').notNull(),
  translatedText: text('translated_text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('cache_hash_lang_idx').on(table.textHash, table.targetLang),
]);

// 抓取任务日志
export const fetchLogs = sqliteTable('fetch_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceName: text('source_name').notNull(),
  status: text('status').notNull(),             // "success", "failed"
  itemsCount: integer('items_count').default(0),
  errorMsg: text('error_msg'),
  duration: integer('duration').notNull(),      // 耗时 (ms)
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('logs_source_created_idx').on(table.sourceName, table.createdAt),
]);

// 类型导出
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type TranslationCacheEntry = typeof translationCache.$inferSelect;
export type NewTranslationCacheEntry = typeof translationCache.$inferInsert;
export type FetchLog = typeof fetchLogs.$inferSelect;
export type NewFetchLog = typeof fetchLogs.$inferInsert;

// 支持的翻译目标语言 (已废弃，使用 Locale 和 allLocales)
export type TargetLocale = Locale;
export const targetLocales = allLocales;
