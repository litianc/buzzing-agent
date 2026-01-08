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

// Load .env from root directory (parent of app/)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
// Also try current directory as fallback
dotenv.config();
import { fetchHackerNews } from '../src/services/hn';
import { fetchShowHN } from '../src/services/showhn';
import { fetchAskHN } from '../src/services/askhn';
import { fetchLobsters } from '../src/services/lobsters';
import { fetchProductHunt } from '../src/services/producthunt';
import { fetchDevto } from '../src/services/devto';
import { fetchWatcha } from '../src/services/watcha';
import { fetchGuardian } from '../src/services/guardian';
import { fetchNature } from '../src/services/nature';
import { fetchSkyNews } from '../src/services/skynews';
import { fetchArsTechnica } from '../src/services/arstechnica';

interface FetchResult {
  source: string;
  success: boolean;
  newPosts?: number;
  duration?: number;
  error?: string;
}

async function main() {
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
