// Buzzing Agent - Fetch All Sources Cron Endpoint
// Triggers all data source fetchers in parallel

import { NextResponse } from 'next/server';
import { fetchHackerNews } from '@/services/hn';
import { fetchShowHN } from '@/services/showhn';
import { fetchAskHN } from '@/services/askhn';
import { fetchLobsters } from '@/services/lobsters';
import { fetchProductHunt } from '@/services/producthunt';
import { fetchDevto } from '@/services/devto';
import { fetchWatcha } from '@/services/watcha';
import { fetchGuardian } from '@/services/guardian';
import { fetchNature } from '@/services/nature';
import { fetchSkyNews } from '@/services/skynews';
import { fetchArsTechnica } from '@/services/arstechnica';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

interface FetchResult {
  source: string;
  success: boolean;
  newPosts?: number;
  duration?: number;
  error?: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: FetchResult[] = [];

  // Define all fetch tasks (translation is done separately by translate-pending cron)
  const fetchTasks = [
    { name: 'hn', fn: () => fetchHackerNews({ type: 'top', limit: 50, minScore: 100 }) },
    { name: 'showhn', fn: () => fetchShowHN({ limit: 30, minScore: 10 }) },
    { name: 'askhn', fn: () => fetchAskHN({ limit: 30, minScore: 50 }) },
    { name: 'lobsters', fn: () => fetchLobsters({ type: 'hottest', limit: 50, minScore: 5 }) },
    { name: 'ph', fn: () => fetchProductHunt({ minVotes: 50 }) },
    { name: 'devto', fn: () => fetchDevto({ limit: 30, minScore: 20 }) },
    { name: 'watcha', fn: () => fetchWatcha({ limit: 30 }) },
    { name: 'guardian', fn: () => fetchGuardian({ limit: 20 }) },
    { name: 'nature', fn: () => fetchNature({ limit: 20 }) },
    { name: 'skynews', fn: () => fetchSkyNews({ limit: 20 }) },
    { name: 'arstechnica', fn: () => fetchArsTechnica({ limit: 20 }) },
  ];

  // Execute all fetches in parallel
  const fetchPromises = fetchTasks.map(async (task) => {
    try {
      const result = await task.fn();
      return {
        source: task.name,
        success: true,
        newPosts: result.newPosts,
        duration: result.duration,
      };
    } catch (error) {
      return {
        source: task.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  const fetchResults = await Promise.all(fetchPromises);
  results.push(...fetchResults);

  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const totalNewPosts = results.reduce((sum, r) => sum + (r.newPosts || 0), 0);

  return NextResponse.json({
    success: true,
    message: `Fetched ${successCount}/${fetchTasks.length} sources`,
    summary: {
      totalNewPosts,
      successCount,
      failCount: fetchTasks.length - successCount,
      totalDuration,
    },
    results,
  });
}
