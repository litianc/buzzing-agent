// Buzzing Agent - i18n Routing Configuration

import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['zh', 'en', 'ja'],
  defaultLocale: 'zh',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;
