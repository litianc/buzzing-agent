import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Header } from "@/components";
import { ImageModeProvider } from '@/contexts/ImageModeContext';
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<Locale, string> = {
    zh: "Buzzing Agent - 用中文浏览全球热门内容",
    en: "Buzzing Agent - Browse Global Trending Content",
    ja: "Buzzing Agent - 世界のトレンドを日本語で",
  };

  const descriptions: Record<Locale, string> = {
    zh: "用中文浏览国外社交媒体里的热门讨论，母语快速导读，感兴趣再进原文深度阅读。",
    en: "Browse trending discussions from global social media, auto-translated for quick reading.",
    ja: "世界のソーシャルメディアのトレンドを日本語で。母語で素早く概要を把握。",
  };

  return {
    title: titles[locale as Locale] || titles.zh,
    description: descriptions[locale as Locale] || descriptions.zh,
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
        <NextIntlClientProvider messages={messages}>
          <ImageModeProvider>
            <Header />
            <main className="max-w-6xl mx-auto px-4 py-6">
              {children}
            </main>
            <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-12">
              <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>Buzzing Agent</p>
                <p className="mt-2">
                  <a href={`/${locale}/feed.xml`} className="hover:text-gray-900 dark:hover:text-gray-100">RSS</a>
                  {' · '}
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-gray-100">GitHub</a>
                </p>
              </div>
            </footer>
          </ImageModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
