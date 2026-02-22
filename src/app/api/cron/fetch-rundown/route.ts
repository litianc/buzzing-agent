// Buzzing Agent - The Rundown AI Fetch Cron Endpoint
// Can be triggered by Vercel Cron or manually

import { NextResponse } from 'next/server';
import { fetchRundown } from '@/services/rundown';

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
    const fetchResult = await fetchRundown({
      limit: 30,
    });

    return NextResponse.json({
      success: true,
      message: 'The Rundown AI fetch completed',
      data: {
        fetched: fetchResult.count,
        newPosts: fetchResult.newPosts,
        deleted: fetchResult.deleted,
        duration: fetchResult.duration,
      },
    });
  } catch (error) {
    console.error('The Rundown AI fetch cron failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
