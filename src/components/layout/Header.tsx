'use client';

// Buzzing Agent - Header Component

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';
import type { Locale } from '@/i18n/routing';

export function Header() {
  const locale = useLocale() as Locale;
  const t = useTranslations('navigation');

  const navItems = [
    { href: '/', label: t('home') },
    { href: '/hn', label: t('hackerNews') },
    { href: '/reddit', label: t('reddit') },
    { href: '/ph', label: t('productHunt') },
    { href: '/watcha', label: t('watcha') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo - 中文显示"蜂涌"，其他语言显示"Buzzing" */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🐝</span>
          <span className={`text-gray-900 dark:text-gray-100 ${locale === 'zh' ? 'tracking-widest' : ''}`}>
            {locale === 'zh' ? '蜂涌' : 'Buzzing'}
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => (
            item.disabled ? (
              <span
                key={item.href}
                className="px-3 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed"
              >
                {item.label}
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {item.label}
              </Link>
            )
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LocaleSwitcher />

          {/* RSS Feed */}
          <a
            href={`/${locale}/feed.xml`}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={t('rssSubscribe')}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.75 3a.75.75 0 01.75.75v.5c0 3.562 2.003 6.657 4.945 8.231l.032.017c.285.147.553.334.825.552a7.52 7.52 0 002.474 1.449.75.75 0 11-.449 1.431A9.019 9.019 0 019.5 14.5c-.324-.299-.63-.605-.92-.905a9.5 9.5 0 01-4.83-8.345v-.5A.75.75 0 013.75 3z" />
              <path d="M3.75 8a.75.75 0 01.75.75v.5a5.75 5.75 0 005.75 5.75h.5a.75.75 0 010 1.5h-.5A7.25 7.25 0 013 9.25v-.5A.75.75 0 013.75 8z" />
              <path d="M5.5 15.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
