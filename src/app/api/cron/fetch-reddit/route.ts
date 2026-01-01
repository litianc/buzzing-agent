// Buzzing Agent - Reddit Fetch Cron Endpoint
// Can be triggered by Vercel Cron or manually

import { NextResponse } from 'next/server';
import { fetchReddit } from '@/services/reddit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 120 seconds max (multiple subreddits)

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
    // Fetch Reddit posts
    const fetchResult = await fetchReddit({
      includePopular: true,
      limit: 25,
      minScore: 100,
      translate: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Reddit fetch completed',
      data: {
        fetched: fetchResult.count,
        newPosts: fetchResult.newPosts,
        deleted: fetchResult.deleted,
        duration: fetchResult.duration,
      },
    });
  } catch (error) {
    console.error('Reddit fetch cron failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
