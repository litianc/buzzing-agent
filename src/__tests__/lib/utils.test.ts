// Tests for utility functions
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { timeAgo, formatScore, cn, truncate, getFaviconUrl } from '@/lib/utils';

describe('utils', () => {
  describe('formatScore', () => {
    it('should return the score as string for numbers less than 1000', () => {
      expect(formatScore(0)).toBe('0');
      expect(formatScore(1)).toBe('1');
      expect(formatScore(100)).toBe('100');
      expect(formatScore(999)).toBe('999');
    });

    it('should format numbers >= 1000 with k suffix', () => {
      expect(formatScore(1000)).toBe('1.0k');
      expect(formatScore(1500)).toBe('1.5k');
      expect(formatScore(10000)).toBe('10.0k');
      expect(formatScore(12345)).toBe('12.3k');
    });
  });

  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should filter out falsy values', () => {
      expect(cn('foo', null, 'bar', undefined, false, 'baz')).toBe('foo bar baz');
    });

    it('should return empty string for no valid classes', () => {
      expect(cn(null, undefined, false)).toBe('');
    });
  });

  describe('truncate', () => {
    it('should return the original text if shorter than maxLength', () => {
      expect(truncate('hello', 10)).toBe('hello');
      expect(truncate('hello', 5)).toBe('hello');
    });

    it('should truncate text longer than maxLength with ellipsis', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
      expect(truncate('this is a long text', 10)).toBe('this is...');
    });
  });

  describe('getFaviconUrl', () => {
    it('should return Google favicon URL for domain', () => {
      expect(getFaviconUrl('example.com')).toBe(
        'https://www.google.com/s2/favicons?domain=example.com&sz=32'
      );
    });

    it('should handle domains with subdomains', () => {
      expect(getFaviconUrl('news.ycombinator.com')).toBe(
        'https://www.google.com/s2/favicons?domain=news.ycombinator.com&sz=32'
      );
    });
  });

  describe('timeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format recent time in Chinese by default', () => {
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');
      const result = timeAgo(fiveMinutesAgo);
      expect(result).toContain('分钟');
    });

    it('should format time in English', () => {
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');
      const result = timeAgo(fiveMinutesAgo, 'en');
      expect(result).toContain('minute');
    });

    it('should format time in Japanese', () => {
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');
      const result = timeAgo(fiveMinutesAgo, 'ja');
      expect(result).toContain('分');
    });

    it('should handle string date input', () => {
      const result = timeAgo('2024-01-15T11:00:00Z', 'en');
      expect(result).toContain('hour');
    });

    it('should handle timestamp input', () => {
      const timestamp = new Date('2024-01-14T12:00:00Z').getTime();
      const result = timeAgo(timestamp, 'en');
      expect(result).toContain('day');
    });
  });
});
