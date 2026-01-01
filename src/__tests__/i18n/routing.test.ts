// Tests for i18n routing configuration
import { describe, it, expect } from 'vitest';
import { routing, type Locale } from '@/i18n/routing';

describe('i18n routing', () => {
  describe('routing configuration', () => {
    it('should have zh, en, ja as supported locales', () => {
      expect(routing.locales).toContain('zh');
      expect(routing.locales).toContain('en');
      expect(routing.locales).toContain('ja');
      expect(routing.locales).toHaveLength(3);
    });

    it('should have zh as default locale', () => {
      expect(routing.defaultLocale).toBe('zh');
    });

    it('should use always prefix mode', () => {
      expect(routing.localePrefix).toBe('always');
    });
  });

  describe('Locale type', () => {
    it('should accept valid locales', () => {
      const validLocales: Locale[] = ['zh', 'en', 'ja'];
      expect(validLocales).toHaveLength(3);
    });
  });
});
