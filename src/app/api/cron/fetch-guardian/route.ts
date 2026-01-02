// Buzzing Agent - The Guardian Fetch Cron Endpoint

import { NextResponse } from 'next/server';
import { fetchGuardian } from '@/services/guardian';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const fetchResult = await fetchGuardian({ limit: 30, translate: true });

    return NextResponse.json({
      success: true,
      message: 'Guardian fetch completed',
      data: fetchResult,
    });
  } catch (error) {
    console.error('Guardian fetch failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
