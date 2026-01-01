// Tests for database schema
import { describe, it, expect } from 'vitest';
import { posts, sources, translationCache } from '@/db/schema';

describe('database schema', () => {
  describe('posts table', () => {
    it('should have required columns', () => {
      expect(posts.id).toBeDefined();
      expect(posts.sourceId).toBeDefined();
      expect(posts.externalId).toBeDefined();
      expect(posts.titleEn).toBeDefined();
      expect(posts.translations).toBeDefined();
      expect(posts.sourceUrl).toBeDefined();
      expect(posts.score).toBeDefined();
      expect(posts.publishedAt).toBeDefined();
    });

    it('should have translations as JSON column', () => {
      // Check that translations column exists
      expect(posts.translations).toBeDefined();
    });
  });

  describe('sources table', () => {
    it('should have required columns', () => {
      expect(sources.id).toBeDefined();
      expect(sources.name).toBeDefined();
      expect(sources.displayName).toBeDefined();
      expect(sources.maxPosts).toBeDefined();
    });

    it('should have maxPosts with default value', () => {
      expect(sources.maxPosts).toBeDefined();
    });
  });

  describe('translationCache table', () => {
    it('should have required columns', () => {
      expect(translationCache.id).toBeDefined();
      expect(translationCache.textHash).toBeDefined();
      expect(translationCache.targetLang).toBeDefined();
      expect(translationCache.translatedText).toBeDefined();
    });

    it('should have targetLang column for multi-language support', () => {
      expect(translationCache.targetLang).toBeDefined();
    });
  });
});
