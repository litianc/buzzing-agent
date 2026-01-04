'use client';

// Buzzing Agent - Header Component with Priority+ Navigation

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useImageMode } from '@/contexts/ImageModeContext';
import type { Locale } from '@/i18n/routing';
import { useState, useRef, useEffect, useCallback } from 'react';

interface NavItem {
  href: string;
  label: string;
}

export function Header() {
  const locale = useLocale() as Locale;
  const t = useTranslations('navigation');
  const { isWithImages, toggleImageMode } = useImageMode();

  const navItems: NavItem[] = [
    { href: '/hn', label: t('hackerNews') },
    { href: '/lobsters', label: t('lobsters') },
    { href: '/arstechnica', label: t('arstechnica') },
    { href: '/guardian', label: t('guardian') },
    { href: '/nature', label: t('nature') },
    { href: '/skynews', label: t('skynews') },
    { href: '/devto', label: t('devto') },
    { href: '/ph', label: t('productHunt') },
    { href: '/watcha', label: t('watcha') },
    { href: '/showhn', label: t('showhn') },
    { href: '/askhn', label: t('askhn') },
  ];

  // Priority+ navigation state
  const [visibleCount, setVisibleCount] = useState(navItems.length);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const navContainerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLDivElement>(null);
  const itemWidthsRef = useRef<number[]>([]);

  // Measure all item widths once on mount (from hidden container)
  useEffect(() => {
    if (!measureRef.current) return;
    const items = measureRef.current.querySelectorAll('[data-nav-measure]');
    itemWidthsRef.current = Array.from(items).map(item => item.getBoundingClientRect().width);
    setMounted(true);
  }, []);

  // Calculate visible items based on available space
  const calculateVisibleItems = useCallback(() => {
    if (!navContainerRef.current || itemWidthsRef.current.length === 0) return;

    const containerWidth = navContainerRef.current.getBoundingClientRect().width;
    const moreButtonWidth = 80; // Approximate width of "More" button
    const gap = 4; // gap between items

    let totalWidth = 0;
    let count = 0;

    for (let i = 0; i < itemWidthsRef.current.length; i++) {
      const itemWidth = itemWidthsRef.current[i] + gap;
      const remainingItems = itemWidthsRef.current.length - i - 1;
      const needsMoreButton = remainingItems > 0;
      const availableWidth = needsMoreButton ? containerWidth - moreButtonWidth : containerWidth;

      if (totalWidth + itemWidth <= availableWidth) {
        totalWidth += itemWidth;
        count++;
      } else {
        break;
      }
    }

    setVisibleCount(count);
  }, []);

  // ResizeObserver for responsive behavior
  useEffect(() => {
    if (!mounted) return;

    calculateVisibleItems();

    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleItems();
    });

    if (navContainerRef.current) {
      resizeObserver.observe(navContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [calculateVisibleItems, mounted]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreButtonRef.current && !moreButtonRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleItems = navItems.slice(0, visibleCount);
  const overflowItems = navItems.slice(visibleCount);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
      {/* Hidden container to measure all nav item widths */}
      <div ref={measureRef} className="absolute invisible whitespace-nowrap overflow-hidden w-0 h-0" aria-hidden="true">
        {navItems.map((item) => (
          <span key={item.href} data-nav-measure className="px-3 py-2 text-sm">
            {item.label}
          </span>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🐝</span>
          <span className={`text-gray-900 dark:text-gray-100 ${locale === 'zh' ? 'tracking-widest' : ''}`}>
            {locale === 'zh' ? '蜂涌' : 'Buzzing'}
          </span>
        </Link>

        {/* Desktop Navigation - Priority+ */}
        <nav ref={navContainerRef} className="hidden md:flex flex-1 items-center min-w-0">
          <div className="flex items-center gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-nav-item
                className="flex-shrink-0 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* More dropdown */}
          {overflowItems.length > 0 && (
            <div ref={moreButtonRef} className="relative flex-shrink-0 ml-1">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t('more')}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreOpen && (
                <div className="absolute left-0 mt-1 py-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  {overflowItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Image Mode Toggle */}
          <button
            onClick={toggleImageMode}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isWithImages ? t('hideImages') : t('showImages')}
          >
            {isWithImages ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </button>

          {/* Language Switcher */}
          <LocaleSwitcher />

          {/* RSS Feed */}
          <a
            href={`/${locale}/feed.xml`}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={t('rssSubscribe')}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a1 1 0 000 2c5.523 0 10 4.477 10 10a1 1 0 102 0C17 8.373 11.627 3 5 3z" />
              <path d="M4 9a1 1 0 011-1 7 7 0 017 7 1 1 0 11-2 0 5 5 0 00-5-5 1 1 0 01-1-1z" />
              <path d="M3 15a2 2 0 114 0 2 2 0 01-4 0z" />
            </svg>
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <nav className="max-w-6xl mx-auto px-4 py-2">
            <div className="grid grid-cols-2 gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
