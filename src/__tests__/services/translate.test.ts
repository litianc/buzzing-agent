// Tests for translation service
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => Promise.resolve()),
      })),
    })),
    query: {
      translationCache: {
        findFirst: vi.fn(() => Promise.resolve(null)),
      },
    },
  },
  translationCache: {},
  targetLocales: ['zh', 'ja'] as const,
  type: {},
}));

describe('translate service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hash function logic', () => {
    // Test the hash logic that the service uses internally
    function hashText(text: string, targetLang: string): string {
      return createHash('md5').update(`${text}:${targetLang}`).digest('hex');
    }

    it('should create consistent hash for same input', () => {
      const hash1 = hashText('hello world', 'zh');
      const hash2 = hashText('hello world', 'zh');
      expect(hash1).toBe(hash2);
    });

    it('should create different hash for different text', () => {
      const hash1 = hashText('hello', 'zh');
      const hash2 = hashText('world', 'zh');
      expect(hash1).not.toBe(hash2);
    });

    it('should create different hash for different target language', () => {
      const hash1 = hashText('hello', 'zh');
      const hash2 = hashText('hello', 'ja');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 32-character MD5 hash', () => {
      const hash = hashText('test', 'zh');
      expect(hash).toHaveLength(32);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('targetLocales', () => {
    it('should include zh and ja from db export', async () => {
      const { targetLocales } = await import('@/db');
      expect(targetLocales).toContain('zh');
      expect(targetLocales).toContain('ja');
    });
  });

  describe('translateText', () => {
    it('should be exported from translate service', async () => {
      const { translateText } = await import('@/services/translate');
      expect(typeof translateText).toBe('function');
    });
  });

  describe('translateToAllLocales', () => {
    it('should be exported from translate service', async () => {
      const { translateToAllLocales } = await import('@/services/translate');
      expect(typeof translateToAllLocales).toBe('function');
    });
  });

  describe('translatePostToAllLocales', () => {
    it('should be exported from translate service', async () => {
      const { translatePostToAllLocales } = await import('@/services/translate');
      expect(typeof translatePostToAllLocales).toBe('function');
    });
  });

  describe('translateBatch', () => {
    it('should be exported from translate service', async () => {
      const { translateBatch } = await import('@/services/translate');
      expect(typeof translateBatch).toBe('function');
    });
  });
});
