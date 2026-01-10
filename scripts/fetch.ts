#!/usr/bin/env npx tsx
/**
 * Standalone fetch script for Buzzing Agent
 * Can be deployed on overseas server to avoid timeout issues
 *
 * Usage: npx tsx scripts/fetch.ts
 * Or: npm run script:fetch
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env BEFORE any other imports
// Try current directory first, then parent directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

interface FetchResult {
  source: string;
  success: boolean;
  newPosts?: number;
  duration?: number;
  error?: string;
}

async function main() {
  // Dynamic imports to ensure env vars are loaded first
  const { fetchHackerNews } = await import('../src/services/hn');
  const { fetchShowHN } = await import('../src/services/showhn');
  const { fetchAskHN } = await import('../src/services/askhn');
  const { fetchLobsters } = await import('../src/services/lobsters');
  const { fetchProductHunt } = await import('../src/services/producthunt');
  const { fetchDevto } = await import('../src/services/devto');
  const { fetchWatcha } = await import('../src/services/watcha');
  const { fetchGuardian } = await import('../src/services/guardian');
  const { fetchNature } = await import('../src/services/nature');
  const { fetchSkyNews } = await import('../src/services/skynews');
  const { fetchArsTechnica } = await import('../src/services/arstechnica');
  console.log('🚀 Starting fetch all sources...\n');
  const startTime = Date.now();

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

  const results: FetchResult[] = [];

  // Execute all fetches in parallel
  const fetchPromises = fetchTasks.map(async (task) => {
    const taskStart = Date.now();
    try {
      const result = await task.fn();
      const res: FetchResult = {
        source: task.name,
        success: true,
        newPosts: result.newPosts,
        duration: result.duration,
      };
      console.log(`✅ ${task.name}: ${result.newPosts} new posts (${result.duration}ms)`);
      return res;
    } catch (error) {
      const res: FetchResult = {
        source: task.name,
        success: false,
        duration: Date.now() - taskStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      console.log(`❌ ${task.name}: ${res.error}`);
      return res;
    }
  });

  const fetchResults = await Promise.all(fetchPromises);
  results.push(...fetchResults);

  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const totalNewPosts = results.reduce((sum, r) => sum + (r.newPosts || 0), 0);

  console.log('\n📊 Summary:');
  console.log(`   Total: ${successCount}/${fetchTasks.length} sources succeeded`);
  console.log(`   New posts: ${totalNewPosts}`);
  console.log(`   Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);

  process.exit(successCount === fetchTasks.length ? 0 : 1);
}

main().catch(console.error);
