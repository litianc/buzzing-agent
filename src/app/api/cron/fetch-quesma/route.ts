// Buzzing Agent - Quesma Blog Fetch Cron Endpoint

import { NextResponse } from 'next/server';
import { fetchQuesma } from '@/services/quesma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const fetchResult = await fetchQuesma({
      limit: 30,
    });

    return NextResponse.json({
      success: true,
      message: 'Quesma Blog fetch completed',
      data: {
        fetched: fetchResult.count,
        newPosts: fetchResult.newPosts,
        deleted: fetchResult.deleted,
        duration: fetchResult.duration,
      },
    });
  } catch (error) {
    console.error('Quesma Blog fetch cron failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
