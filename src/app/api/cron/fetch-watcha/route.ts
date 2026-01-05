// Buzzing Agent - Watcha (观猹) Fetch Cron Endpoint
// Can be triggered by Vercel Cron or manually

import { NextResponse } from 'next/server';
import { fetchWatcha } from '@/services/watcha';

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
    // Fetch Watcha products (热度榜前 30 名, translation is done separately by translate-pending cron)
    const fetchResult = await fetchWatcha({
      includeNew: true,
      limit: 30,
    });

    return NextResponse.json({
      success: true,
      message: 'Watcha fetch completed',
      data: {
        fetched: fetchResult.count,
        newPosts: fetchResult.newPosts,
        deleted: fetchResult.deleted,
        duration: fetchResult.duration,
      },
    });
  } catch (error) {
    console.error('Watcha fetch cron failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
