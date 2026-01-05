// Buzzing Agent - Product Hunt Fetch Cron Endpoint
// Can be triggered by Vercel Cron or manually

import { NextResponse } from 'next/server';
import { fetchProductHunt } from '@/services/producthunt';

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
    // Fetch Product Hunt posts (RANKING = 当日热门, translation is done separately by translate-pending cron)
    const fetchResult = await fetchProductHunt({
      minVotes: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'Product Hunt fetch completed',
      data: {
        fetched: fetchResult.count,
        newPosts: fetchResult.newPosts,
        deleted: fetchResult.deleted,
        duration: fetchResult.duration,
      },
    });
  } catch (error) {
    console.error('Product Hunt fetch cron failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
