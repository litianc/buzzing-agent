// Buzzing Agent - Utility Functions

import { formatDistanceToNow, format } from 'date-fns';
import { zhCN, enUS, ja } from 'date-fns/locale';
import type { Locale } from '@/i18n/routing';

// Locale mapping for date-fns
const dateLocales = {
  zh: zhCN,
  en: enUS,
  ja: ja,
};

// Format relative time based on locale
export function timeAgo(date: Date | string | number, locale: Locale = 'zh'): string {
  const d = date instanceof Date ? date : new Date(date);
  return formatDistanceToNow(d, { addSuffix: true, locale: dateLocales[locale] });
}

// Format date in short format (MM-dd)
export function formatDate(date: Date | string | number, locale: Locale = 'zh'): string {
  const d = date instanceof Date ? date : new Date(date);
  return format(d, 'MM-dd', { locale: dateLocales[locale] });
}

// Format score with unit
export function formatScore(score: number): string {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return String(score);
}

// Merge class names (simple version, can use clsx/tailwind-merge later)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Get favicon URL from domain
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}
