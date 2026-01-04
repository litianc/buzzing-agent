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

  // Define all fetch tasks
  const fetchTasks = [
    { name: 'hn', fn: () => fetchHackerNews({ type: 'top', limit: 50, minScore: 100, translate: true }) },
    { name: 'showhn', fn: () => fetchShowHN({ limit: 30, minScore: 10, translate: true }) },
    { name: 'askhn', fn: () => fetchAskHN({ limit: 30, minScore: 50, translate: true }) },
    { name: 'lobsters', fn: () => fetchLobsters({ type: 'hottest', limit: 50, minScore: 5, translate: true }) },
    { name: 'ph', fn: () => fetchProductHunt({ daysBack: 3, minVotes: 50, limit: 50, translate: true }) },
    { name: 'devto', fn: () => fetchDevto({ limit: 30, minReactions: 20, translate: true }) },
    { name: 'watcha', fn: () => fetchWatcha({ limit: 30, translate: true }) },
    { name: 'guardian', fn: () => fetchGuardian({ limit: 20, translate: true }) },
    { name: 'nature', fn: () => fetchNature({ limit: 20, translate: true }) },
    { name: 'skynews', fn: () => fetchSkyNews({ limit: 20, translate: true }) },
    { name: 'arstechnica', fn: () => fetchArsTechnica({ limit: 20, translate: true }) },
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
