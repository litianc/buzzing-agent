// Buzzing Agent - Translation Service
// Primary: Tencent Cloud TMT (500万字符/月免费)
// Supports: EN (English), ZH (Chinese), JA (Japanese)

import { createHash } from 'crypto';
import { db, translationCache, type Locale, allLocales, type PostTranslations } from '@/db';
import { and, eq } from 'drizzle-orm';
import * as tencentcloud from 'tencentcloud-sdk-nodejs-tmt';

// 兼容旧代码
export type TargetLocale = Locale;
export const targetLocales = allLocales;

interface TranslateResult {
  text: string;
  alternatives?: string[];
  fromCache?: boolean;
}

// Map locale to Tencent language code
function getTencentLangCode(locale: Locale): string {
  const langMap: Record<Locale, string> = {
    'en': 'en',
    'zh': 'zh',
    'ja': 'ja',
  };
  return langMap[locale];
}

// MD5 hash for cache key (includes target language)
function hashText(text: string, targetLang: Locale): string {
  return createHash('md5').update(`${text}:${targetLang}`).digest('hex');
}

// Check translation cache (locale-aware)
async function checkCache(text: string, targetLang: Locale): Promise<string | null> {
  const hash = hashText(text, targetLang);
  const cached = await db.query.translationCache.findFirst({
    where: and(
      eq(translationCache.textHash, hash),
      eq(translationCache.targetLang, targetLang)
    ),
  });
  return cached?.translatedText || null;
}

// Save to translation cache (locale-aware)
async function saveCache(
  originalText: string,
  translatedText: string,
  targetLang: Locale
): Promise<void> {
  const hash = hashText(originalText, targetLang);
  try {
    await db.insert(translationCache).values({
      textHash: hash,
      targetLang,
      originalText,
      translatedText,
    }).onConflictDoNothing();
  } catch (error) {
    console.error('Failed to save translation cache:', error);
  }
}

// Tencent Cloud TMT client singleton
let tmtClient: InstanceType<typeof tencentcloud.tmt.v20180321.Client> | null = null;

function getTmtClient() {
  if (tmtClient) return tmtClient;

  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const region = process.env.TENCENT_REGION || 'ap-guangzhou';

  if (!secretId || !secretKey) {
    throw new Error('Tencent Cloud credentials not configured (TENCENT_SECRET_ID, TENCENT_SECRET_KEY)');
  }

  const TmtClient = tencentcloud.tmt.v20180321.Client;

  tmtClient = new TmtClient({
    credential: {
      secretId,
      secretKey,
    },
    region,
    profile: {
      httpProfile: {
        endpoint: 'tmt.tencentcloudapi.com',
      },
    },
  });

  return tmtClient;
}

// Tencent Cloud Translation (primary)
async function tencentTranslate(
  text: string,
  targetLang: Locale,
  sourceLang: Locale = 'en'
): Promise<TranslateResult> {
  const client = getTmtClient();

  const params = {
    SourceText: text,
    Source: getTencentLangCode(sourceLang),
    Target: getTencentLangCode(targetLang),
    ProjectId: 0,
  };

  const response = await client.TextTranslate(params);

  if (!response.TargetText) {
    throw new Error('Tencent TMT returned no translation');
  }

  return {
    text: response.TargetText,
  };
}

// Main translation function
export async function translateText(
  text: string,
  targetLang: Locale,
  sourceLang: Locale = 'en'
): Promise<TranslateResult> {
  // Skip empty or very short text
  if (!text || text.trim().length < 2) {
    return { text };
  }

  // Skip if source and target are the same
  if (sourceLang === targetLang) {
    return { text };
  }

  // 1. Check cache first
  const cached = await checkCache(text, targetLang);
  if (cached) {
    return { text: cached, fromCache: true };
  }

  // 2. Use Tencent Cloud Translation
  try {
    const result = await tencentTranslate(text, targetLang, sourceLang);
    await saveCache(text, result.text, targetLang);
    return result;
  } catch (error) {
    console.error(`Tencent translation failed for ${sourceLang}->${targetLang}:`, error);
    // Return original text on failure
    return { text };
  }
}

// Translate to all OTHER locales (not the source)
export async function translateToAllLocales(
  text: string,
  sourceLang: Locale = 'en'
): Promise<Record<Locale, string>> {
  const results = {} as Record<Locale, string>;

  // 源语言直接使用原文
  results[sourceLang] = text;

  // 翻译到其他语言
  for (const locale of allLocales) {
    if (locale === sourceLang) continue; // 跳过源语言

    try {
      const result = await translateText(text, locale, sourceLang);
      results[locale] = result.text;

      // Small delay to avoid rate limiting (only if not cached)
      if (!result.fromCache) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Failed to translate to ${locale}:`, error);
      results[locale] = text; // Fallback to original
    }
  }

  return results;
}

// Translate post to all locales
export async function translatePostToAllLocales(post: {
  titleOriginal: string;
  summaryOriginal?: string | null;
  originalLang?: Locale;
}): Promise<PostTranslations> {
  const sourceLang = post.originalLang || 'en';
  const titleTranslations = await translateToAllLocales(post.titleOriginal, sourceLang);

  let summaryTranslations: Record<Locale, string> | undefined;
  if (post.summaryOriginal) {
    summaryTranslations = await translateToAllLocales(post.summaryOriginal, sourceLang);
  }

  const translations: PostTranslations = {};

  for (const locale of allLocales) {
    translations[locale] = {
      title: titleTranslations[locale],
      summary: summaryTranslations?.[locale],
    };
  }

  return translations;
}

// Batch translation for multiple texts to a single locale
export async function translateBatch(
  texts: string[],
  targetLang: Locale,
  sourceLang: Locale = 'en'
): Promise<TranslateResult[]> {
  const results: TranslateResult[] = [];

  for (const text of texts) {
    try {
      const result = await translateText(text, targetLang, sourceLang);
      results.push(result);

      // Small delay to avoid rate limiting
      if (!result.fromCache) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Failed to translate: "${text.slice(0, 50)}..."`, error);
      results.push({ text }); // Return original on error
    }
  }

  return results;
}
