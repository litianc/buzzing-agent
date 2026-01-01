// Buzzing Clone - HN Fetch Cron Endpoint
// Can be triggered by Vercel Cron or manually

import { NextResponse } from 'next/server';
import { fetchHackerNews, translatePendingPosts } from '@/services/hn';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max

export async function GET(request: Request) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Fetch new HN posts
    const fetchResult = await fetchHackerNews({
      type: 'top',
      limit: 100,
      minScore: 100,
      translate: true,
    });

    // Translate any remaining pending posts
    const translatedCount = await translatePendingPosts(20);

    return NextResponse.json({
      success: true,
      message: 'HN fetch completed',
      data: {
        fetched: fetchResult.count,
        newPosts: fetchResult.newPosts,
        deleted: fetchResult.deleted,
        translated: translatedCount,
        duration: fetchResult.duration,
      },
    });
  } catch (error) {
    console.error('HN fetch cron failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
