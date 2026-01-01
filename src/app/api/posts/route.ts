// Buzzing Agent - Posts API
// Supports pagination and filtering

import { NextRequest, NextResponse } from 'next/server';
import { db, posts, sources } from '@/db';
import { desc, eq, count, SQL, and } from 'drizzle-orm';
import type { PostCardData, PaginatedResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
  const source = searchParams.get('source'); // Filter by source name

  const offset = (page - 1) * limit;

  try {
    // Build where conditions
    const conditions: SQL[] = [];

    if (source) {
      const sourceRecord = await db.query.sources.findFirst({
        where: eq(sources.name, source),
      });

      if (!sourceRecord) {
        return NextResponse.json(
          { error: `Source '${source}' not found` },
          { status: 404 }
        );
      }

      conditions.push(eq(posts.sourceId, sourceRecord.id));
    }

    // Build and execute query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        id: posts.id,
        titleOriginal: posts.titleOriginal,
        originalLang: posts.originalLang,
        titleEn: posts.titleEn,
        translations: posts.translations,
        sourceUrl: posts.sourceUrl,
        originUrl: posts.originUrl,
        sourceDomain: posts.sourceDomain,
        thumbnailUrl: posts.thumbnailUrl,
        author: posts.author,
        authorUrl: posts.authorUrl,
        score: posts.score,
        tags: posts.tags,
        publishedAt: posts.publishedAt,
        sourceName: sources.name,
        sourceDisplayName: sources.displayName,
      })
      .from(posts)
      .leftJoin(sources, eq(posts.sourceId, sources.id))
      .where(whereClause)
      .orderBy(desc(posts.publishedAt), desc(posts.score))
      .limit(limit)
      .offset(offset);

    // Get total count with same conditions
    const countResult = await db
      .select({ count: count() })
      .from(posts)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    const data: PostCardData[] = result.map((row) => ({
      id: row.id,
      titleOriginal: row.titleOriginal || row.titleEn || '',
      originalLang: row.originalLang || 'en',
      titleEn: row.titleEn,
      translations: row.translations,
      sourceUrl: row.sourceUrl,
      originUrl: row.originUrl,
      sourceDomain: row.sourceDomain,
      thumbnailUrl: row.thumbnailUrl,
      author: row.author,
      authorUrl: row.authorUrl,
      score: row.score ?? 0,
      tags: row.tags ?? [],
      publishedAt: row.publishedAt!,
      source: {
        name: row.sourceName ?? 'unknown',
        displayName: row.sourceDisplayName ?? 'Unknown',
      },
    }));

    const response: PaginatedResponse<PostCardData> = {
      data,
      total,
      page,
      limit,
      hasMore: offset + data.length < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
