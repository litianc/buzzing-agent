'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

const localeLabels: Record<Locale, string> = {
  zh: '中文',
  en: 'EN',
  ja: '日本語',
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-0.5">
      {(['zh', 'en', 'ja'] as Locale[]).map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            locale === loc
              ? 'bg-gray-200 dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {localeLabels[loc]}
        </button>
      ))}
    </div>
  );
}
